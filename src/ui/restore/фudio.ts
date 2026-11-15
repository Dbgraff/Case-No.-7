import type {
  AudioRestoration,
  Find,
  RestorationOutcome,
  TranscriptPart,
  ValueRange,
} from "../game/finds";

/** Slider positions at the start (and after "start over"). */
const START = { noise: 10, hum: 0, speed: 4.19 };

/** Tape speed slider range, cm/s. */
const SPEED_MIN = 2.4;
const SPEED_MAX = 9.5;

/** Standard cassette speed, cm/s (only used to draw the wave). */
const NOMINAL_SPEED = 4.76;

/** Distance outside the good range (in slider units) where the hum loss reaches 100%. */
const HUM_SCALE = 40;

/** Distance outside the good range (cm/s) where the speed loss reaches 100%. */
const SPEED_SCALE = 1.5;

/** Logical size of the waveform canvas, px. */
const WAVE_W = 580;
const WAVE_H = 80;

/** Which problem hides a character. */
type Glyph = "ok" | "noise" | "hum" | "speed" | "cut";

/** What is shown instead of a hidden character. */
const SYMBOL: Record<Exclude<Glyph, "ok">, string> = {
  noise: "·",
  hum: "░",
  speed: "~",
  cut: "×",
};

/** Current slider values. */
type Settings = { noise: number; hum: number; speed: number };

/**
 * Creates a small seeded random number generator (mulberry32), so the same
 * tape always gets the same pattern of lost characters.
 * @param {string} seed - Any string.
 * @returns {() => number} Function returning numbers in [0, 1).
 */
function seeded(seed: string): () => number {
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
 * Returns how far a value is outside a range, as a share of `scale` (0..1).
 * @param {number} value - Current value.
 * @param {ValueRange} range - Good range.
 * @param {number} scale - Distance that gives 1.
 * @returns {number} 0 inside the range, up to 1 far away from it.
 */
function outside(value: number, range: ValueRange, scale: number): number {
  if (value < range.from) return Math.min(1, (range.from - value) / scale);
  if (value > range.to) return Math.min(1, (value - range.to) / scale);
  return 0;
}

/**
 * Builds the text the player hears with the current settings.
 * @param {TranscriptPart[]} parts - Transcript of the tape.
 * @param {Settings} s - Slider values.
 * @param {AudioRestoration["good"]} good - Good ranges.
 * @param {string} seed - Seed (the find id).
 * @returns {{ text: string, fragileOk: boolean }} Text with lost characters
 * replaced by symbols, and whether all fragile parts are intact.
 */
function buildText(
  parts: TranscriptPart[],
  s: Settings,
  good: AudioRestoration["good"],
  seed: string,
): { text: string; fragileOk: boolean } {
  const rNoise = seeded(`${seed}:n`);
  const rHum = seeded(`${seed}:h`);
  const rSpeed = seeded(`${seed}:s`);

  const noiseLoss = s.noise < good.noise.from ? (good.noise.from - s.noise) / good.noise.from : 0;
  const overClean = s.noise > good.noise.to;
  const humLoss = outside(s.hum, good.hum, HUM_SCALE);
  const speedLoss = outside(s.speed, good.speed, SPEED_SCALE);

  let text = "";
  let fragileOk = true;
  for (const part of parts) {
    for (const ch of part.text) {
      const a = rNoise();
      const b = rHum();
      const c = rSpeed();
      let g: Glyph = "ok";
      if (ch !== " ") {
        if (part.fragile && overClean) g = "cut";
        else if (c < speedLoss) g = "speed";
        else if (b < humLoss) g = "hum";
        else if (a < noiseLoss) g = "noise";
      }
      if (part.fragile && g !== "ok") fragileOk = false;
      text += g === "ok" ? ch : SYMBOL[g];
    }
  }
  return { text, fragileOk };
}

/**
 * Creates a labelled slider row.
 * @param {string} label - Row label.
 * @param {number} min - Slider minimum.
 * @param {number} max - Slider maximum.
 * @param {number} step - Slider step.
 * @param {number} value - Initial value.
 * @returns {{ row: HTMLElement, input: HTMLInputElement, out: HTMLElement }} Row, slider and value label.
 */
function sliderRow(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
): { row: HTMLElement; input: HTMLInputElement; out: HTMLElement } {
  const row = document.createElement("label");
  row.className = "audio-row";
  const name = document.createElement("span");
  name.textContent = label;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const out = document.createElement("span");
  out.className = "muted";
  row.append(name, input, out);
  return { row, input, out };
}

/**
 * Creates a small section heading.
 * @param {string} text - Heading text.
 * @returns {HTMLElement} Heading element.
 */
function sectionLabel(text: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "label";
  el.textContent = text;
  return el;
}

/**
 * Opens the audio restoration window. The player tunes the sliders (the
 * preview and the wave change at once) and then records one clean copy:
 * that copy is what goes to the notes, and it cannot be redone.
 * @param {Find} find - Find being restored.
 * @param {AudioRestoration} restoration - Restoration task description.
 * @param {(outcome: RestorationOutcome) => void} onDone - Called once, when the clean copy is recorded.
 * @returns {void}
 */
export function openAudioRestoration(
  find: Find,
  restoration: AudioRestoration,
  onDone: (outcome: RestorationOutcome) => void,
): void {
  const overlay = document.createElement("div");
  overlay.className = "restore-overlay";
  const dialog = document.createElement("div");
  dialog.className = "restore-dialog";

  const title = document.createElement("h3");
  title.textContent = restoration.label;
  const hint = document.createElement("p");
  hint.className = "muted";
  const HINT_TEXT =
    "Крутите ползунки — идёт предпросмотр. Чистовая копия — то, что попадёт в блокнот, и записать её можно один раз.";
  hint.textContent = HINT_TEXT;

  const wave = document.createElement("canvas");
  wave.className = "audio-wave";
  wave.width = WAVE_W;
  wave.height = WAVE_H;
  const waveCtx = wave.getContext("2d")!;

  const noiseUi = sliderRow("Шумодав", 0, 100, 1, START.noise);
  const humUi = sliderRow("Фильтр гула 50 Гц", 0, 100, 1, START.hum);
  const speedUi = sliderRow("Скорость плёнки", SPEED_MIN, SPEED_MAX, 0.01, START.speed);

  const legend = document.createElement("p");
  legend.className = "muted audio-legend";
  legend.textContent = "· шум   ░ гул   ~ скорость   × срезано шумодавом";

  const preview = document.createElement("div");
  preview.className = "audio-preview";

  const copyLabel = sectionLabel("Чистовая копия");
  const copy = document.createElement("div");
  copy.className = "audio-copy";
  copyLabel.hidden = true;
  copy.hidden = true;

  const record = document.createElement("button");
  record.type = "button";
  record.className = "btn";
  record.textContent = "Записать чистовую копию";
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "btn ghost";
  reset.textContent = "Начать заново";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "btn ghost";
  close.textContent = "Закрыть";
  const buttons = document.createElement("div");
  buttons.className = "map-actions";
  buttons.append(record, reset, close);

  dialog.append(
    title,
    hint,
    wave,
    noiseUi.row,
    humUi.row,
    speedUi.row,
    legend,
    sectionLabel("Предпросмотр"),
    preview,
    buttons,
    copyLabel,
    copy,
  );
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  /** Static random jitter of the wave (so it does not flicker while dragging). */
  const jitterRng = seeded(`${find.id}:wave`);
  const jitter = Array.from({ length: WAVE_W }, () => jitterRng() * 2 - 1);
  let recorded = false;

  /**
   * Reads the current slider values.
   * @returns {Settings} Noise (%), hum (%), speed (cm/s).
   */
  const read = (): Settings => ({
    noise: Number(noiseUi.input.value),
    hum: Number(humUi.input.value),
    speed: Number(speedUi.input.value),
  });

  /**
   * Draws the wave: the speech, the leftover hiss and the 50 Hz hum.
   * @param {Settings} s - Slider values.
   * @returns {void}
   */
  const drawWave = (s: Settings): void => {
    waveCtx.fillStyle = "#1d211c";
    waveCtx.fillRect(0, 0, WAVE_W, WAVE_H);
    waveCtx.strokeStyle = "#8fd17c";
    waveCtx.lineWidth = 1.2;
    waveCtx.beginPath();
    const stretch = s.speed / NOMINAL_SPEED;
    const noiseAmp = 0.05 + 0.7 * (1 - s.noise / 100);
    const humAmp = 0.45 * (1 - s.hum / 100);
    for (let x = 0; x < WAVE_W; x++) {
      const p = (x * stretch) / 9;
      const speech = Math.sin(p) * Math.sin(p * 0.23) * 0.5;
      const hum = Math.sin(x * 0.06) * humAmp;
      const v = Math.max(-1, Math.min(1, speech + hum + jitter[x] * noiseAmp * 0.5));
      const y = WAVE_H / 2 - v * (WAVE_H / 2) * 0.9;
      if (x === 0) waveCtx.moveTo(x, y);
      else waveCtx.lineTo(x, y);
    }
    waveCtx.stroke();
  };

  /**
   * Redraws labels, wave and preview for the current sliders.
   * @returns {void}
   */
  const update = (): void => {
    const s = read();
    noiseUi.out.textContent = `${s.noise}%`;
    humUi.out.textContent = `${s.hum}%`;
    speedUi.out.textContent = `${s.speed.toFixed(2)} см/с`;
    drawWave(s);
    preview.textContent = buildText(restoration.transcript, s, restoration.good, find.id).text;
  };

  /**
   * Records the clean copy: fixes the current preview as the result, locks
   * the controls and reports the outcome.
   * @returns {void}
   */
  const recordCopy = (): void => {
    if (recorded) return;
    recorded = true;
    const { text, fragileOk } = buildText(
      restoration.transcript,
      read(),
      restoration.good,
      find.id,
    );
    copy.textContent = text;
    copyLabel.hidden = false;
    copy.hidden = false;
    for (const el of [noiseUi.input, humUi.input, speedUi.input, record, reset]) {
      el.disabled = true;
    }
    hint.textContent = fragileOk
      ? "Копия записана — запись разборчива."
      : "Копия записана, но часть записи разобрать не удалось. Оцифровка одна — переделать нельзя.";
    close.textContent = "Готово";
    onDone({ text, digitsLost: !fragileOk });
  };

  /** Removes the window and the key listener. */
  const closeAll = (): void => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") closeAll();
  };
  document.addEventListener("keydown", onKey);
  close.addEventListener("click", closeAll);

  for (const ui of [noiseUi, humUi, speedUi]) ui.input.addEventListener("input", update);
  record.addEventListener("click", recordCopy);
  reset.addEventListener("click", () => {
    if (recorded) return;
    noiseUi.input.value = String(START.noise);
    humUi.input.value = String(START.hum);
    speedUi.input.value = String(START.speed);
    hint.textContent = HINT_TEXT;
    update();
  });
  update();
}
