import type { Find, Restoration } from "../finds";

/** Logical size of the paper, px (the canvas is scaled by CSS). */
const W = 560;
const H = 380;

/** Wiping brush width, px. */
const BRUSH = 38;

/** Share of the mold that must be removed to finish the restoration. */
const DONE_AT = 0.9;

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
function drawPaper(ctx: CanvasRenderingContext2D, result: Restoration["result"]): void {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#efe7cf");
  g.addColorStop(1, "#dccfa9");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(109, 91, 44, 0.45)";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

  ctx.fillStyle = "#2b2416";
  ctx.textBaseline = "top";
  ctx.font = "30px Neucha, 'Comic Sans MS', cursive";
  ctx.fillText(result.title, 36, 34);

  ctx.font = "24px Neucha, 'Comic Sans MS', cursive";
  const lines = wrapLines(ctx, result.text, W - 72);
  lines.forEach((l, i) => ctx.fillText(l, 36, 96 + i * 32));
}

/**
 * Draws mold spots (soft green-grey blotches) on the mold layer.
 * @param {CanvasRenderingContext2D} ctx - Context of the mold canvas.
 * @param {() => number} rng - Seeded random generator.
 * @param {number} spots - Number of spots.
 * @returns {void}
 */
function drawMold(ctx: CanvasRenderingContext2D, rng: () => number, spots: number): void {
  for (let i = 0; i < spots; i++) {
    const cx = 70 + rng() * (W - 140);
    const cy = 70 + rng() * (H - 140);
    const r = 34 + rng() * 30;
    for (let k = 0; k < 10; k++) {
      const ang = rng() * Math.PI * 2;
      const dist = rng() * r * 0.8;
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist;
      const rr = r * (0.4 + rng() * 0.45);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, rr);
      grad.addColorStop(0, "rgba(44, 62, 36, 0.97)");
      grad.addColorStop(0.65, "rgba(76, 102, 56, 0.9)");
      grad.addColorStop(1, "rgba(76, 102, 56, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
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
  onDone: () => void,
): void {
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
  const mold = document.createElement("canvas");
  for (const c of [base, mold]) {
    c.width = W;
    c.height = H;
  }
  mold.className = "restore-mold";
  stage.appendChild(base);
  stage.appendChild(mold);

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
    drawPaper(baseCtx, restoration.result);
    drawMold(moldCtx, seededRandom(find.id), restoration.spots);
    initial = Math.max(coverage(moldCtx), 1);
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
      hint.textContent = "Готово — текст можно прочитать.";
      close.textContent = "Готово";
      onDone();
    }
  };

  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  let lastCheck = 0;

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
   * Wipes the mold along a segment from the last point to (x, y).
   * @param {number} x - End x.
   * @param {number} y - End y.
   * @returns {void}
   */
  const wipe = (x: number, y: number): void => {
    moldCtx.globalCompositeOperation = "destination-out";
    moldCtx.lineWidth = BRUSH;
    moldCtx.lineCap = "round";
    moldCtx.beginPath();
    moldCtx.moveTo(lastX, lastY);
    moldCtx.lineTo(x, y);
    moldCtx.stroke();
    lastX = x;
    lastY = y;
  };

  mold.addEventListener("pointerdown", (e) => {
    drawing = true;
    mold.setPointerCapture(e.pointerId);
    [lastX, lastY] = toCanvas(e);
    wipe(lastX + 0.01, lastY);
  });
  mold.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const [x, y] = toCanvas(e);
    wipe(x, y);
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
