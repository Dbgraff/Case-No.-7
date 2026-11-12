import "./style.css";
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";

/* ===== simple radio chat ===== */
const chatEl = document.getElementById("chat")!;
function say(who: string, text: string, cls = "") {
  const bub = document.createElement("div");
  bub.className = "bub" + (cls ? " " + cls : "");
  const b = document.createElement("b");
  b.textContent = who;
  bub.appendChild(b);
  bub.appendChild(document.createTextNode(text));
  chatEl.appendChild(bub);
  chatEl.scrollTop = chatEl.scrollHeight;
}

/* ===== tabs ===== */
const tabs = document.getElementById("tabs")!;
tabs.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("button[data-tab]") as HTMLButtonElement | null;
  if (!btn) return;
  const tab = btn.dataset.tab!;
  tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
  document.querySelectorAll<HTMLElement>(".pane").forEach((p) => {
    const on = p.dataset.pane === tab;
    p.classList.toggle("on", on);
    p.hidden = !on;
  });
});

/* ===== places on the map ===== */
type Place = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const PLACES: Place[] = [
  { id: "gate", name: "Ворота", x: 40, y: 160, w: 80, h: 44 },
  { id: "k1", name: "Корпус 1", x: 160, y: 70, w: 100, h: 52 },
  { id: "k2", name: "Корпус 2", x: 300, y: 80, w: 90, h: 48 },
  { id: "club", name: "Клуб", x: 170, y: 180, w: 90, h: 48 },
  { id: "stage", name: "Эстрада", x: 310, y: 220, w: 100, h: 44 },
];

let selected: Place | null = null;
const btnSend = document.getElementById("btnSend") as HTMLButtonElement;
const placeLabel = document.getElementById("placeLabel")!;

function selectPlace(p: Place | null) {
  selected = p;
  btnSend.disabled = !p;
  placeLabel.textContent = p ? p.name : "место не выбрано";
}

btnSend.addEventListener("click", () => {
  if (!selected) return;
  say("Даша", `Идём к «${selected.name}». Приём.`, "find");
  say("Артём", "Приняли. Выдвигаемся.");
  selectPlace(null);
});

/* ===== Pixi map ===== */
async function initPixi() {
  const host = document.getElementById("pixi-host")!;
  const app = new Application();
  await app.init({
    background: "#2a2e28",
    resizeTo: host,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  const world = new Container();
  app.stage.addChild(world);

  const ground = new Graphics();
  ground.rect(0, 0, 480, 340);
  ground.fill(0x3d4538);
  world.addChild(ground);

  const grid = new Graphics();
  for (let x = 0; x <= 480; x += 40) {
    grid.moveTo(x, 0);
    grid.lineTo(x, 340);
  }
  for (let y = 0; y <= 340; y += 40) {
    grid.moveTo(0, y);
    grid.lineTo(480, y);
  }
  grid.stroke({ width: 1, color: 0x4a5344, alpha: 0.45 });
  world.addChild(grid);

  const title = new Text({
    text: "ЛАГЕРЬ «РАКЕТА» · 2026",
    style: new TextStyle({
      fontFamily: "PT Mono, monospace",
      fontSize: 12,
      fill: 0x9aa294,
      letterSpacing: 1.5,
    }),
  });
  title.x = 14;
  title.y = 10;
  world.addChild(title);

  const placeGfx = new Map<string, { bg: Graphics; label: Text }>();

  for (const p of PLACES) {
    const g = new Container();
    g.eventMode = "static";
    g.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, p.w, p.h, 4);
    bg.fill(0xb8bca8);
    bg.stroke({ width: 1.5, color: 0x6d5b2c });
    g.addChild(bg);

    const label = new Text({
      text: p.name,
      style: new TextStyle({
        fontFamily: "PT Mono, monospace",
        fontSize: 12,
        fill: 0x2b2416,
      }),
    });
    label.anchor.set(0.5);
    label.x = p.w / 2;
    label.y = p.h / 2;
    g.addChild(label);

    g.x = p.x;
    g.y = p.y;

    g.on("pointerover", () => {
      bg.clear();
      bg.roundRect(0, 0, p.w, p.h, 4);
      bg.fill(0xd0d4c4);
      bg.stroke({ width: 2, color: 0xd45348 });
    });
    g.on("pointerout", () => {
      const isSel = selected?.id === p.id;
      bg.clear();
      bg.roundRect(0, 0, p.w, p.h, 4);
      bg.fill(isSel ? 0xc8c1a6 : 0xb8bca8);
      bg.stroke({ width: isSel ? 2.5 : 1.5, color: isSel ? 0xd45348 : 0x6d5b2c });
    });
    g.on("pointertap", () => {
      selectPlace(p);
      for (const pl of PLACES) {
        const node = placeGfx.get(pl.id);
        if (!node) continue;
        const on = pl.id === p.id;
        node.bg.clear();
        node.bg.roundRect(0, 0, pl.w, pl.h, 4);
        node.bg.fill(on ? 0xc8c1a6 : 0xb8bca8);
        node.bg.stroke({ width: on ? 2.5 : 1.5, color: on ? 0xd45348 : 0x6d5b2c });
      }
      say("Штаб", `Отметили на карте: ${p.name}.`);
    });

    world.addChild(g);
    placeGfx.set(p.id, { bg, label });
  }

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  world.x = 20;
  world.y = 20;

  app.canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    world.x += dx;
    world.y += dy;
  });

  const hint = new Text({
    text: "Тяните карту · клик по зданию — выбор",
    style: new TextStyle({
      fontFamily: "PT Mono, monospace",
      fontSize: 11,
      fill: 0x7a8274,
    }),
  });
  hint.x = 14;
  hint.y = 318;
  world.addChild(hint);
}

/* ===== boot ===== */
say("Даша", "Штаб, мы у ворот «Ракеты». До заката пять часов. Корпуса 1, 2 и 4 — третьего нет. Где жила «Искра»?");
say(
  "Командир",
  "Поиск по архиву бесплатный. Выходы группы стоят времени. Сначала разберитесь в документах, потом отправляйте ребят.",
);

initPixi().catch((err) => {
  console.error(err);
  say("Система", "Не удалось запустить карту (Pixi). Проверьте консоль.", "sys");
});