import "./deskCamera.css";

export const DESK_CAMERA_ZOOM = 1.35;
export const DESK_CAMERA_DURATION = 550;

type CameraOptions = {
  target: HTMLElement;
  title: string;
  content: HTMLElement;
  onClose?: () => void;
};

export interface DeskCamera {
  open(options: CameraOptions): void;
  close(): void;
  isOpen(): boolean;
}

let instance: DeskCamera | null = null;

/**
 * Camera coordinates are measured relative to the existing restoration desk.
 * The background and physical objects move together; the inspection board
 * remains at a fixed screen position and overlays the desk.
 */
export function initDeskCamera(): DeskCamera {
  if (instance) return instance;

  const desk = document.getElementById("spaceTable");
  const workspace = document.querySelector<HTMLElement>(".id-table-workspace");
  const surface = document.getElementById("deskItems");

  if (!desk || !workspace) {
    throw new Error("Не найдено рабочее пространство реставрационного стола");
  }

  const board = document.createElement("aside");
  board.className = "desk-camera-board";
  board.setAttribute("aria-label", "Осмотр предмета");
  board.inert = true;
  board.innerHTML = [
    '<header class="desk-camera-board-header">',
    '<button type="button" class="desk-camera-back">← Назад к столу</button>',
    '</header>',
    '<div class="desk-camera-board-body">',
    '<h2 class="desk-camera-board-title"></h2>',
    '<div class="desk-camera-board-content"></div>',
    '</div>',
  ].join("");
  desk.appendChild(board);

  const back = board.querySelector<HTMLButtonElement>(".desk-camera-back")!;
  const title = board.querySelector<HTMLElement>(".desk-camera-board-title")!;
  const body = board.querySelector<HTMLElement>(".desk-camera-board-content")!;

  // Preserve the original position of #deskInspect and all its event listeners.
  const originalInspectParent = document.getElementById("deskInspect")?.parentNode;
  const originalInspectNext = document.getElementById("deskInspect")?.nextSibling;

  let opened = false;
  let activeTarget: HTMLElement | null = null;
  let activeClose: (() => void) | undefined;
  let translationX = 0;
  let translationY = 0;
  let scale = 1;

  function setTransform(x: number, y: number, zoom: number): void {
    translationX = x;
    translationY = y;
    scale = zoom;
    for (const root of [desk!, workspace!]) {
      root.style.setProperty("--desk-camera-x", x + "px");
      root.style.setProperty("--desk-camera-y", y + "px");
      root.style.setProperty("--desk-camera-scale", String(zoom));
    }
  }

  function setTransformOrigin(element: HTMLElement, deskRect: DOMRect): void {
    // Origin is the center of the desk, expressed in the element's
    // untransformed coordinate system.
    const rect = element.getBoundingClientRect();
    const centerX = deskRect.left + deskRect.width / 2;
    const centerY = deskRect.top + deskRect.height / 2;
    const baseLeft = centerX + (rect.left - centerX - translationX) / scale;
    const baseTop = centerY + (rect.top - centerY - translationY) / scale;
    element.style.transformOrigin =
      (centerX - baseLeft) + "px " + (centerY - baseTop) + "px";
  }

  function open(options: CameraOptions): void {
    const deskRect = desk!.getBoundingClientRect();
    const targetRect = options.target.getBoundingClientRect();
    const centerX = deskRect.left + deskRect.width / 2;
    const centerY = deskRect.top + deskRect.height / 2;

    // Undo the current camera transform if the player selects another item.
    const sourceX = centerX +
      ((targetRect.left + targetRect.width / 2) - centerX - translationX) / scale;
    const sourceY = centerY +
      ((targetRect.top + targetRect.height / 2) - centerY - translationY) / scale;

    const desiredX = deskRect.left + deskRect.width * 0.37;
    const desiredY = deskRect.top + deskRect.height * 0.49;
    const x = desiredX - centerX - (sourceX - centerX) * DESK_CAMERA_ZOOM;
    const y = desiredY - centerY - (sourceY - centerY) * DESK_CAMERA_ZOOM;

    if (surface) setTransformOrigin(surface, deskRect);
    const prologueScene = workspace!.querySelector<HTMLElement>(".prologue-desk-scene");
    if (prologueScene) setTransformOrigin(prologueScene, deskRect);

    // A different selection should not detach the existing inspection
    // content until the next panel is ready.
    activeTarget = options.target;
    activeClose = options.onClose;

    title.textContent = options.title;
    body.replaceChildren(options.content);
    board.inert = false;
    opened = true;
    desk!.classList.add("desk-camera-focused");
    workspace!.classList.add("desk-camera-focused");
    setTransform(x, y, DESK_CAMERA_ZOOM);
  }

  function close(): void {
    if (!opened) return;
    opened = false;
    desk!.classList.remove("desk-camera-focused");
    workspace!.classList.remove("desk-camera-focused");
    setTransform(0, 0, 1);
    board.inert = true;

    // Restore the real inspection node rather than copying its HTML:
    // this preserves the restoration button event handlers.
    const inspect = document.getElementById("deskInspect");
    if (inspect && originalInspectParent && inspect.parentNode === body) {
      if (originalInspectNext && originalInspectNext.parentNode === originalInspectParent) {
        originalInspectParent.insertBefore(inspect, originalInspectNext);
      } else {
        originalInspectParent.appendChild(inspect);
      }
    }

    activeTarget = null;
    const cb = activeClose;
    activeClose = undefined;
    cb?.();
  }

  back.addEventListener("click", close);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && opened &&
        !workspace!.querySelector(".case7-prologue.chat-popup-open")) {
      close();
    }
  });

  setTransform(0, 0, 1);
  instance = { open, close, isOpen: () => opened };
  return instance;
}

export function getDeskCamera(): DeskCamera | null {
  return instance;
}
