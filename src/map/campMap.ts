import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import type { Place } from "../data/places";
import "./campMap.css";

/** Callbacks the map uses to talk to the rest of the game. */
export type CampMapHandlers = {
  /** Called when the player clicks a place. */
  onSelect: (place: Place) => void;
};

/** Public handle of an initialized map. */
export type CampMap = {
  /**
   * Highlights the given place (or clears the highlight when `null`).
   * Does not fire `onSelect`.
   */
  setSelected: (id: string | null) => void;
  /**
   * Moves the group marker to the given place.
   * @param {string} id - Id of the place where the group is.
   */
  setGroupPlace: (id: string) => void;
};

const COLORS = {
  fill: 0xb8bca8,
  fillHover: 0xd0d4c4,
  fillSelected: 0xc8c1a6,
  stroke: 0x6d5b2c,
  accent: 0xd45348,
};

/**
 * Draws a place rectangle in one of three visual states.
 * @param {Graphics} bg - Graphics object to (re)draw.
 * @param {Place} p - Place whose size is used.
 * @param {"normal" | "hover" | "selected"} state - Visual state.
 * @returns {void}
 */
function drawPlace(
  bg: Graphics,
  p: Place,
  state: "normal" | "hover" | "selected",
): void {
  bg.clear();
  bg.roundRect(0, 0, p.w, p.h, 4);
  if (state === "hover") {
    bg.fill(COLORS.fillHover);
    bg.stroke({ width: 2, color: COLORS.accent });
  } else if (state === "selected") {
    bg.fill(COLORS.fillSelected);
    bg.stroke({ width: 2.5, color: COLORS.accent });
  } else {
    bg.fill(COLORS.fill);
    bg.stroke({ width: 1.5, color: COLORS.stroke });
  }
}

/**
 * Creates the Pixi camp map inside `host`: ground, grid, clickable places
 * and drag-to-pan.
 * @param {HTMLElement} host - Element the canvas is mounted into.
 * @param {Place[]} places - Places to draw.
 * @param {CampMapHandlers} handlers - Event callbacks.
 * @returns {Promise<CampMap>} Handle for controlling the map from outside.
 */
export async function initCampMap(
  host: HTMLElement,
  places: Place[],
  handlers: CampMapHandlers,
): Promise<CampMap> {

  const app = new Application();

  await app.init({
    background: "#28332b",
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    width: Math.max(1, host.clientWidth),
    height: Math.max(1, host.clientHeight),
  });

  host.appendChild(app.canvas);
  app.canvas.style.touchAction = "none";


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

  const gfx = new Map<string, Graphics>();
  let selectedId: string | null = null;

  /**
   * Redraws all places according to the current selection.
   * @returns {void}
   */
  const refresh = (): void => {
    for (const p of places) {
      const bg = gfx.get(p.id);
      if (bg) drawPlace(bg, p, p.id === selectedId ? "selected" : "normal");
    }
  };

  for (const p of places) {
    const g = new Container();
    g.eventMode = "static";
    g.cursor = "pointer";

    const bg = new Graphics();
    drawPlace(bg, p, "normal");
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

    g.on("pointerover", () => drawPlace(bg, p, "hover"));
    g.on("pointerout", () =>
      drawPlace(bg, p, p.id === selectedId ? "selected" : "normal"),
    );
    g.on("pointertap", () => {
      selectedId = p.id;
      refresh();
      handlers.onSelect(p);
    });

    world.addChild(g);
    gfx.set(p.id, bg);
  }

  // group marker (drawn above the places)
  const groupMarker = new Graphics();
  groupMarker.circle(0, 0, 7);
  groupMarker.fill(COLORS.accent);
  groupMarker.stroke({ width: 2, color: 0xffffff });
  groupMarker.visible = false;
  world.addChild(groupMarker);

  // drag-to-pan

  const MAP_W = 480;
  const MAP_H = 340;
  const MARGIN = 18;

  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function resetView(): void {
    const width = host.clientWidth;
    const height = host.clientHeight;

    if (width < 2 || height < 2) return;

    app.renderer.resize(width, height);

    const scale = Math.max(
      0.05,
      Math.min(
        (width - MARGIN * 2) / MAP_W,
        (height - MARGIN * 2) / MAP_H
      )
    );

    world.scale.set(scale);

    offsetX = (width - MAP_W * scale) / 2;
    offsetY = (height - MAP_H * scale) / 2;

    world.position.set(offsetX, offsetY);
  }

  // Отслеживаем изменение размера окна.
  const observer = new ResizeObserver(resetView);
  observer.observe(host);

  requestAnimationFrame(resetView);

  window.addEventListener("resize", resetView);

  // При открытии страницы карты пересчитываем масштаб.
  document.addEventListener(
    "case7:browser-page",
    (event: Event) => {
      const page = (event as CustomEvent<string>).detail;

      if (page === "map") {
        requestAnimationFrame(resetView);
      }
    }
  );

  // Ограниченное перетаскивание карты.
  app.canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  });

  window.addEventListener("pointerup", () => {
    dragging = false;
  });

  window.addEventListener("pointermove", (event) => {
    if (!dragging || host.clientWidth < 2) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;

    lastX = event.clientX;
    lastY = event.clientY;

    const maxPan = 65;

    world.x = Math.max(
      offsetX - maxPan,
      Math.min(offsetX + maxPan, world.x + dx)
    );

    world.y = Math.max(
      offsetY - maxPan,
      Math.min(offsetY + maxPan, world.y + dy)
    );
  });

  const hint = new Text({
    text: "Тяните карту · клик по зданию — выбор · красная точка — группа",
    style: new TextStyle({
      fontFamily: "PT Mono, monospace",
      fontSize: 11,
      fill: 0x7a8274,
    }),
  });
  hint.x = 14;
  hint.y = 318;
  world.addChild(hint);

  return {
    setSelected(id) {
      selectedId = id;
      refresh();
    },
    setGroupPlace(id) {
      const p = places.find((pl) => pl.id === id);
      if (!p) {
        groupMarker.visible = false;
        return;
      }
      groupMarker.position.set(p.x + p.w - 8, p.y + 8);
      groupMarker.visible = true;
    },
  };
}
