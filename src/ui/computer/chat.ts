/**
 * Message kinds shown in the radio chat. Maps to a CSS modifier on `.bub`.
 * - "" — regular message from a group member
 * - "sys" — system notification
 * - "story" — important story message (new find, plot turn)
 */
export type ChatKind = "" | "sys" | "story";

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
  const bub = document.createElement("div");
  bub.className = "bub" + (kind ? " " + kind : "");
  const b = document.createElement("b");
  b.textContent = who;
  bub.appendChild(b);
  bub.appendChild(document.createTextNode(text));
  chatEl.appendChild(bub);
  chatEl.scrollTop = chatEl.scrollHeight;
}
