/**
 * Message kinds shown in the radio chat. Maps to a CSS modifier on `.bub`.
 * - "" — regular message
 * - "find" — highlighted message about a find
 * - "sys" — system notification
 */
export type ChatKind = "" | "find" | "sys";

const chatEl = document.getElementById("chat")!;

/**
 * Appends a message bubble to the radio chat and scrolls to the bottom.
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
