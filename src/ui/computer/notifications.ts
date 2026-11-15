import { say, type ChatKind } from "./chat";
import { getActiveSpace, onSpaceChange, showSpace } from "../spaces";
import { getActiveTab, onTabChange, showTab } from "./tabs";

/** Id of the tab that contains the chat. */
const CHAT_TAB = "hq";

/** How long a pop-up stays on screen, ms. */
const TOAST_LIFETIME_MS = 6000;

/** Maximum number of pop-ups shown at the same time. */
const MAX_TOASTS = 4;

let unread = 0;
let badgeEl: HTMLElement | null = null;
let toastsEl: HTMLElement | null = null;

/**
 * Creates the unread badge on the chat tab button and the pop-up container.
 * Must be called once at startup, after `initTabs()`.
 * @returns {void}
 */
export function initNotifications(): void {
  const chatTabBtn = document.querySelector<HTMLButtonElement>(
    `#tabs button[data-tab="${CHAT_TAB}"]`,
  );
  if (chatTabBtn) {
    badgeEl = document.createElement("span");
    badgeEl.className = "tab-badge";
    badgeEl.hidden = true;
    chatTabBtn.appendChild(badgeEl);
  }

  toastsEl = document.createElement("div");
  toastsEl.className = "toasts";
  document.body.appendChild(toastsEl);

  const resetIfChatVisible = (): void => {
    if (isChatVisible()) {
      unread = 0;
      renderBadge();
    }
  };
  onTabChange(resetIfChatVisible);
  onSpaceChange(resetIfChatVisible);
}

/**
 * Tells whether the chat is on screen right now (computer space, chat tab).
 * @returns {boolean} `true` if the player can see the chat.
 */
function isChatVisible(): boolean {
  return getActiveSpace() === "computer" && getActiveTab() === CHAT_TAB;
}

/**
 * Shows the current unread count on the chat tab button.
 * @returns {void}
 */
function renderBadge(): void {
  if (!badgeEl) return;
  badgeEl.hidden = unread === 0;
  badgeEl.textContent = String(unread);
}

/**
 * Returns the letter shown in a pop-up avatar.
 * @param {string} who - Sender name.
 * @param {ChatKind} kind - Message kind.
 * @returns {string} One character.
 */
function avatarChar(who: string, kind: ChatKind): string {
  if (kind === "sys") return "i";
  return who.trim().charAt(0).toUpperCase() || "?";
}

/**
 * Shows a messenger-style pop-up in the bottom-right corner: avatar, sender,
 * text and a close button. Clicking the pop-up opens the chat tab.
 * @param {string} who - Sender shown in bold.
 * @param {string} text - Message text.
 * @param {ChatKind} kind - Message kind (affects the style).
 * @returns {void}
 */
function showToast(who: string, text: string, kind: ChatKind): void {
  if (!toastsEl) return;
  const toast = document.createElement("div");
  toast.className = "toast" + (kind ? " " + kind : "");

  const ava = document.createElement("div");
  ava.className = "toast-ava";
  ava.textContent = avatarChar(who, kind);

  const body = document.createElement("div");
  body.className = "toast-body";
  const name = document.createElement("b");
  name.textContent = who;
  const msg = document.createElement("span");
  msg.textContent = text;
  body.appendChild(name);
  body.appendChild(msg);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.setAttribute("aria-label", "Закрыть");
  close.textContent = "×";

  toast.appendChild(ava);
  toast.appendChild(body);
  toast.appendChild(close);

  /** Fades the pop-up out and removes it. */
  const remove = (): void => {
    toast.classList.add("out");
    window.setTimeout(() => toast.remove(), 250);
  };
  close.addEventListener("click", (e) => {
    e.stopPropagation();
    remove();
  });
  toast.addEventListener("click", () => {
    showSpace("computer");
    showTab(CHAT_TAB);
    remove();
  });

  toastsEl.appendChild(toast);
  while (toastsEl.children.length > MAX_TOASTS) toastsEl.firstElementChild?.remove();
  window.setTimeout(remove, TOAST_LIFETIME_MS);
}

/**
 * Delivers a game message to the player. It always goes into the chat. If the
 * chat is not on screen, the message also shows a pop-up in the bottom-right
 * corner and increases the unread badge on the chat tab.
 * @param {string} who - Sender name.
 * @param {string} text - Message text.
 * @param {ChatKind} [kind=""] - "" regular, "sys" system, "story" important.
 * @returns {void}
 */
export function notify(who: string, text: string, kind: ChatKind = ""): void {
  say(who, text, kind);
  if (isChatVisible()) return;
  unread++;
  renderBadge();
  showToast(who, text, kind);
}
