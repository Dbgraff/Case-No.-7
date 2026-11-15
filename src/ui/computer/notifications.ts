import { say, type ChatKind } from "./chat";
import { getActiveSpace, onSpaceChange, showSpace } from "../spaces";
import { getActiveTab, onTabChange, showTab } from "./tabs";

const CHAT_TAB = "hq";
const TOAST_LIFETIME_MS = 6500;
const MAX_TOASTS = 4;

let unread = 0;
let tabBadge: HTMLElement | null = null;
let dockBadge: HTMLElement | null = null;
let toastsEl: HTMLElement | null = null;

/** In the new desktop, the chat is in its own window, not an HQ tab. */
function isChatVisible(): boolean {
  if (document.visibilityState === "hidden" || getActiveSpace() !== "computer") return false;
  const chat = document.getElementById("chat");
  const desktopWindow = chat?.closest<HTMLElement>(".desktop-window");
  if (desktopWindow) {
    const style = window.getComputedStyle(desktopWindow);
    const box = desktopWindow.getBoundingClientRect();
    if (style.display === "none" || style.visibility === "hidden" || box.width === 0 || box.height === 0) return false;

    // A chat window hidden behind the browser is not a read message.
    const otherWindows = document.querySelectorAll<HTMLElement>(".desktop-window");
    const chatZ = Number(style.zIndex) || 0;
    for (const other of otherWindows) {
      if (other === desktopWindow || other.hidden) continue;
      if (window.getComputedStyle(other).display === "none") continue;
      if ((Number(window.getComputedStyle(other).zIndex) || 0) > chatZ) return false;
    }
    return true;
  }
  return getActiveTab() === CHAT_TAB;
}

function ensureDockBadge(): void {
  if (dockBadge?.isConnected) return;
  const button = document.querySelector<HTMLElement>('.dock-item[data-open="chat"]');
  if (!button) return;
  dockBadge = document.createElement("span");
  dockBadge.className = "tab-badge";
  dockBadge.hidden = true;
  dockBadge.setAttribute("aria-label", "Непрочитанные сообщения");
  button.appendChild(dockBadge);
}

function renderBadge(): void {
  ensureDockBadge();
  for (const el of [tabBadge, dockBadge]) {
    if (!el) continue;
    el.hidden = unread === 0;
    el.textContent = String(unread);
  }
}

function clearWhenVisible(): void {
  if (!isChatVisible()) return;
  unread = 0;
  renderBadge();
}

export function initNotifications(): void {
  const chatTabBtn = document.querySelector<HTMLButtonElement>(
    `#tabs button[data-tab="${CHAT_TAB}"]`,
  );
  if (chatTabBtn) {
    tabBadge = document.createElement("span");
    tabBadge.className = "tab-badge";
    tabBadge.hidden = true;
    chatTabBtn.appendChild(tabBadge);
  }

  toastsEl = document.createElement("div");
  toastsEl.className = "toasts";
  document.body.appendChild(toastsEl);

  onTabChange(clearWhenVisible);
  onSpaceChange(clearWhenVisible);
  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('.dock-item[data-open="chat"], .window-chat')) {
      // The desktop may open its chat on the same click. Check afterward.
      window.setTimeout(clearWhenVisible, 0);
    }
  });
  document.addEventListener("visibilitychange", clearWhenVisible);
}

function showToast(who: string, text: string, kind: ChatKind): void {
  if (!toastsEl) return;
  const toast = document.createElement("div");
  toast.className = `toast${kind ? ` ${kind}` : ""}`;

  const avatar = document.createElement("div");
  avatar.className = "toast-ava";
  avatar.textContent = kind === "sys" ? "i" : who.trim().charAt(0).toUpperCase() || "?";

  const content = document.createElement("div");
  content.className = "toast-body";
  const name = document.createElement("b");
  name.textContent = who;
  const message = document.createElement("span");
  message.textContent = text;
  content.append(name, message);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Закрыть уведомление");
  toast.append(avatar, content, close);

  let removing = false;
  const remove = (): void => {
    if (removing) return;
    removing = true;
    toast.classList.add("out");
    window.setTimeout(() => toast.remove(), 250);
  };
  close.addEventListener("click", event => { event.stopPropagation(); remove(); });
  toast.addEventListener("click", () => {
    showSpace("computer");
    showTab(CHAT_TAB);
    document.querySelector<HTMLButtonElement>('.dock-item[data-open="chat"]')?.click();
    remove();
    window.setTimeout(clearWhenVisible, 50);
  });

  toastsEl.appendChild(toast);
  while (toastsEl.children.length > MAX_TOASTS) toastsEl.firstElementChild?.remove();
  window.setTimeout(remove, TOAST_LIFETIME_MS);
}

/** All messages are delivered to chat; hidden messages receive badges + toast. */
export function notify(who: string, text: string, kind: ChatKind = ""): void {
  say(who, text, kind);
  if (isChatVisible()) {
    clearWhenVisible();
    return;
  }
  unread++;
  renderBadge();
  showToast(who, text, kind);
}
