import type { Find, Restoration, RestorationOutcome } from "./../game/finds";
import { openAudioRestoration } from "./restoreAudio";

/** Logical size of the paper, px (the canvas is scaled by CSS). */
const W = 560;
const H = 380;

/** Wiping brush width, px. */
const BRUSH = 52;

/** Share of the mold that must be removed to finish the restoration. */
const DONE_AT = 0.7;

/** Share of mold removed by one brush stamp (0..1). Lower = more passes needed. */
const MOLD_STRENGTH = 0.1;

/** Mold amount multiplier relative to `restoration.spots`. */
const MOLD_DENSITY = 2;

/** Wiping speed above which the ink starts to wear off, canvas px per ms. */
const SAFE_SPEED = 0.6;

/** Share of ink removed by one stamp at maximum damage (0..1). */
const INK_STRENGTH = 0.3;

/** Hint shown while the player wipes too fast. */
const WARN_TEXT = "Чернила стираются — двигайте медленнее.";

/**
 * Creates a small seeded random number generator (mulberry32), so the same
 * find always gets the same mold pattern.
 * @param {string} seed - Any string (the find id).
 * @returns {() => number} Function returning numbers in [0, 1).
 */
function seededRandom(seed: string): () => number {
  let h = 1779033703;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Splits text into lines that fit into `maxWidth` for the current canvas font.
 * @param {CanvasRenderingContext2D} ctx - Context with the font already set.
 * @param {string} text - Text to wrap.
 * @param {number} maxWidth - Maximum line width in px.
 * @returns {string[]} Lines.
 */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draws the paper with the hidden text (the layer under the mold).
 * @param {CanvasRenderingContext2D} ctx - Context of the base canvas.
 * @param {Restoration["result"]} result - Text to write on the paper.
 * @returns {void}
 */
function drawPaper(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#efe7cf");
  g.addColorStop(1, "#dccfa9");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(109, 91, 44, 0.45)";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
}

/**
 * Draws the handwritten text on its own transparent layer, so it can wear
 * off without damaging the paper.
 * @param {CanvasRenderingContext2D} ctx - Context of the ink canvas.
 * @param {Restoration["result"]} result - Text to write.
 * @returns {void}
 */
function drawInk(ctx: CanvasRenderingContext2D, result: Restoration["result"]): void {
  ctx.fillStyle = "#2b2416";
  ctx.textBaseline = "top";
  ctx.font = "30px Neucha, 'Comic Sans MS', cursive";
  ctx.fillText(result.title, 36, 34);

  ctx.font = "24px Neucha, 'Comic Sans MS', cursive";
  const lines = wrapLines(ctx, result.text, W - 72);
  lines.forEach((l, i) => ctx.fillText(l, 36, 96 + i * 32));
}

/**
 * Converts wiping speed to ink damage.
 * @param {number} speed - Wiping speed, canvas px per ms.
 * @returns {number} Damage from 0 (safe) to 1 (maximum).
 */
function inkDamage(speed: number): number {
  return Math.min(1, Math.max(0, (speed - SAFE_SPEED) / SAFE_SPEED));
}

/**
 * Estimates how much ink is left (sum of sampled opacity, so half-erased
 * ink counts as half).
 * @param {CanvasRenderingContext2D} ctx - Context of the ink canvas.
 * @returns {number} Relative amount of ink.
 */
function inkLeft(ctx: CanvasRenderingContext2D): number {
  const d = ctx.getImageData(0, 0, W, H).data;
  let sum = 0;
  for (let i = 3; i < d.length; i += 16) sum += d[i];
  return sum / 255;
}

/**
 * Stamps one soft, slightly random blob that erases part of the layer's
 * opacity. Many overlapping stamps give a smooth, uneven wipe.
 * @param {CanvasRenderingContext2D} ctx - Layer to erase from.
 * @param {number} x - Center x.
 * @param {number} y - Center y.
 * @param {number} radius - Brush radius, px.
 * @param {number} alpha - Erase strength of the center (0..1).
 * @returns {void}
 */
function stamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  const r = radius * (0.8 + Math.random() * 0.4);
  const cx = x + (Math.random() - 0.5) * radius * 0.4;
  const cy = y + (Math.random() - 0.5) * radius * 0.4;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
  g.addColorStop(0.5, `rgba(0, 0, 0, ${alpha * 0.6})`);
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draws mold: big uneven patches (dense core, thin edges, different
 * opacity per blob) plus small spores around them.
 * @param {CanvasRenderingContext2D} ctx - Context of the mold canvas.
 * @param {() => number} rng - Seeded random generator.
 * @param {number} spots - Base number of spots (multiplied by MOLD_DENSITY).
 * @returns {void}
 */
function drawMold(ctx: CanvasRenderingContext2D, rng: () => number, spots: number): void {
  const total = Math.round(spots * MOLD_DENSITY);
  for (let i = 0; i < total; i++) {
    const cx = 50 + rng() * (W - 100);
    const cy = 50 + rng() * (H - 100);
    const r = 45 + rng() * 45;

    for (let k = 0; k < 28; k++) {
      const ang = rng() * Math.PI * 2;
      const dist = rng() ** 1.5 * r; // more blobs near the center
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist;
      const rr = r * (0.25 + rng() * 0.45);
      const a = 0.35 + rng() * 0.6; // some blobs are thin, some dense
      const grad = ctx.createRadialGradient(x, y, 0, x, y, rr);
      grad.addColorStop(0, `rgba(44, 62, 36, ${a})`);
      grad.addColorStop(0.6, `rgba(76, 102, 56, ${a * 0.9})`);
      grad.addColorStop(1, "rgba(76, 102, 56, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let k = 0; k < 40; k++) {
      const ang = rng() * Math.PI * 2;
      const dist = r * (0.6 + rng() * 0.9);
      ctx.fillStyle = `rgba(60, 84, 44, ${0.3 + rng() * 0.5})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, 1 + rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Counts (sampled) the pixels of the mold layer that are still covered.
 * @param {CanvasRenderingContext2D} ctx - Context of the mold canvas.
 * @returns {number} Number of sampled covered pixels.
 */
function coverage(ctx: CanvasRenderingContext2D): number {
  const d = ctx.getImageData(0, 0, W, H).data;
  let count = 0;
  for (let i = 3; i < d.length; i += 16) if (d[i] > 30) count++;
  return count;
}

/**
 * Opens the mold-removal restoration window for a find. The player wipes the
 * mold off with the mouse or finger; the text below becomes readable.
 * @param {Find} find - Find being restored.
 * @param {Restoration} restoration - Restoration task description.
 * @param {() => void} onDone - Called once when the restoration is complete.
 * @returns {void}
 */
export function openRestoration(
  find: Find,
  restoration: Restoration,
  onDone: (outcome?: RestorationOutcome) => void,
): void {
  if (restoration.kind === "audio") {
    openAudioRestoration(find, restoration, onDone);
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "restore-overlay";

  const dialog = document.createElement("div");
  dialog.className = "restore-dialog";

  const title = document.createElement("h3");
  title.textContent = `Реставрация: ${find.title}`;

  const hint = document.createElement("p");
  hint.className = "muted";
  hint.textContent = "Зажмите кнопку мыши (или палец) и протирайте пятна плесени.";

  const stage = document.createElement("div");
  stage.className = "restore-stage";
  const base = document.createElement("canvas");
  const ink = document.createElement("canvas");
  const mold = document.createElement("canvas");
  for (const c of [base, ink, mold]) {
    c.width = W;
    c.height = H;
  }
  mold.className = "restore-mold";
  stage.append(base, ink, mold);

  const bar = document.createElement("div");
  bar.className = "restore-bar";
  const barFill = document.createElement("div");
  bar.appendChild(barFill);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "btn ghost";
  close.textContent = "Закрыть";

  dialog.append(title, hint, stage, bar, close);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  /** Closes the window and removes the key listener. */
  const closeAll = (): void => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") closeAll();
  };
  document.addEventListener("keydown", onKey);
  close.addEventListener("click", closeAll);

  const baseCtx = base.getContext("2d")!;
  const moldCtx = mold.getContext("2d")!;
  const inkCtx = ink.getContext("2d")!;
  let initialInk = 1;
  let initial = 1;
  let finished = false;

  /**
   * Draws the paper and the mold (after the handwriting font is loaded).
   * @returns {Promise<void>}
   */
  const setup = async (): Promise<void> => {
    try {
      await document.fonts.load("24px Neucha");
    } catch {
      // font failed to load — fallback font is used
    }
    drawPaper(baseCtx);
    drawInk(inkCtx, restoration.result);
    drawMold(moldCtx, seededRandom(find.id), restoration.spots);
    initial = Math.max(coverage(moldCtx), 1);
    initialInk = Math.max(inkLeft(inkCtx), 1);
  };
  void setup();

  /**
   * Recalculates the progress, updates the bar and finishes when done.
   * @returns {void}
   */
  const updateProgress = (): void => {
    if (finished) return;
    const progress = Math.min(1, Math.max(0, 1 - coverage(moldCtx) / initial));
    barFill.style.width = `${Math.round(progress * 100)}%`;
    if (progress >= DONE_AT) {
      finished = true;
      moldCtx.clearRect(0, 0, W, H);
      barFill.style.width = "100%";
      hint.textContent =
        inkLeft(inkCtx) / initialInk > 0.8
          ? "Готово — текст можно прочитать."
          : "Готово, но часть надписи стёрта.";      close.textContent = "Готово";
      onDone();
    }
  };

  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  let lastCheck = 0;
  let lastT = 0;
  let segDist = 0;
  let segTime = 0;
  let damage = 0;

  /**
   * Converts a pointer event to canvas coordinates.
   * @param {PointerEvent} e - Pointer event.
   * @returns {[number, number]} x, y on the canvas.
   */
  const toCanvas = (e: PointerEvent): [number, number] => {
    const r = mold.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };

  /**
   * Wipes the mold along a segment from the last point to (x, y) with soft
   * stamps placed every few pixels.
   * @param {number} x - End x.
   * @param {number} y - End y.
   * @returns {void}
   */
  const wipe = (x: number, y: number, dmg = 0): void => {
    const dx = x - lastX;
    const dy = y - lastY;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (BRUSH * 0.2)));
    for (let i = 1; i <= steps; i++) {
      const px = lastX + (dx * i) / steps;
      const py = lastY + (dy * i) / steps;
      stamp(moldCtx, px, py, BRUSH / 2, MOLD_STRENGTH);
      if (dmg > 0) stamp(inkCtx, px, py, BRUSH / 2, dmg * INK_STRENGTH);
    }
    lastX = x;
    lastY = y;
  };

  mold.addEventListener("pointerdown", (e) => {
    if (finished) return;
    drawing = true;
    mold.setPointerCapture(e.pointerId);
    [lastX, lastY] = toCanvas(e);
    lastT = e.timeStamp;
    segDist = 0;
    segTime = 0;
    damage = 0;
    wipe(lastX + 0.01, lastY);
  });
  mold.addEventListener("pointermove", (e) => {
    if (!drawing || finished) return;
    const [x, y] = toCanvas(e);

    // speed is measured over windows of ~16 ms, so single events don't spike it
    segDist += Math.hypot(x - lastX, y - lastY);
    segTime += e.timeStamp - lastT;
    lastT = e.timeStamp;
    if (segTime >= 16) {
      damage = inkDamage(segDist / segTime);
      segDist = 0;
      segTime = 0;
      hint.textContent =
        damage > 0.3 ? WARN_TEXT : "Зажмите кнопку мыши (или палец) и протирайте пятна плесени.";
    }

    wipe(x, y, damage);
    const now = performance.now();
    if (now - lastCheck > 250) {
      lastCheck = now;
      updateProgress();
    }
  });
  const stop = (): void => {
    if (!drawing) return;
    drawing = false;
    updateProgress();
  };
  mold.addEventListener("pointerup", stop);
  mold.addEventListener("pointercancel", stop);
}
