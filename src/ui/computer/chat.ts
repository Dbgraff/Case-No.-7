import { getState, recordRadioMessage, type RadioMessage } from "../../core/state";

/**
 * Message kinds shown in the radio chat. Maps to a CSS modifier on `.bub`.
 * - "" — regular message from a group member
 * - "sys" — system notification
 * - "story" — important story message (new find, plot turn)
 */
export type ChatKind = RadioMessage["kind"];

const chatEl = document.getElementById("chat")!;

/**
 * Appends a message bubble to the radio chat and scrolls to the bottom.
 * Prefer `notify()` from `ui/notifications` for game events: it also
 * handles badges and pop-ups when the chat tab is not open.
 * @param {string} who - Speaker name shown in bold.
 * @param {string} text - Message text (inserted as plain text, no HTML).
 * @param {ChatKind} [kind=""] - Message kind (CSS modifier).
 * @returns {void}
 */
export function say(who: string, text: string, kind: ChatKind = ""): void {
  const message = { who, text, kind };
  recordRadioMessage(message);
  appendRadioBubble(chatEl, message);
  document.dispatchEvent(new CustomEvent("case7:chat-message", { detail: message }));
}

export function appendRadioBubble(host: HTMLElement, { who, text, kind }: RadioMessage): void {
  const bubble = document.createElement("div");
  bubble.className = kind ? `bub ${kind}` : "bub";
  const author = document.createElement("b");
  author.textContent = who;
  bubble.append(author, document.createTextNode(text));
  host.appendChild(bubble);
  host.scrollTop = host.scrollHeight;
}

/** Replay saved messages without unread counters or toast notifications. */
export function restoreRadioHistory(host: HTMLElement): void {
  for (const message of getState().radioHistory) {
    appendRadioBubble(host, message);
  }
}

export function hasRadioMessage(who: string, text: string, kind: ChatKind): boolean {
  return getState().radioHistory.some(message =>
    message.who === who && message.text === text && message.kind === kind,
  );
}

restoreRadioHistory(chatEl);