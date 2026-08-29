function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function transcriptHtml(lines) {
  const content = lines.length > 0
    ? lines.map((line) => `<div class="mud-line mud-line--${escapeHtml(line.kind ?? "output")}">${escapeHtml(line.text)}</div>`).join("")
    : '<div class="mud-line quiet">Choose a name to enter Farstone.</div>';
  return `<div id="farstone-transcript" class="mud-transcript" role="log" aria-live="polite" aria-relevant="additions text" tabindex="0">${content}</div>`;
}

export function farstoneRoomOptions(frame, { connection = "disconnected", name = "", transcript = [] } = {}) {
  const connected = connection === "playing" || connection === "snapshot" || connection === "delta";
  const statusHtml = connected
    ? `<p><strong>${escapeHtml(name)}</strong> · ${escapeHtml(frame?.place?.name ?? "entering the world")} · tick ${Number(frame?.tick ?? 0)}</p>`
    : `<form id="farstone-connect"><label for="farstone-name">Name</label><input id="farstone-name" name="name" maxlength="24" value="${escapeHtml(name)}" required><button type="submit">Enter Farstone</button></form>`;
  return {
    title: "Farstone",
    subtitle: "A living harbor town on FeltOS",
    eyebrow: "QwzSpace · TUFTE",
    tick: frame?.tick,
    entries: [],
    tileForEntry: () => [],
    leadingTiles: [{
      id: "connection",
      role: "status",
      lifecycle: connected ? "active" : connection === "error" ? "stale" : "pending",
      confidence: connected ? "high" : "low",
      span: 12,
      title: connected ? "Playing" : connection === "error" ? "Connection interrupted" : "Choose a name",
      html: statusHtml,
    }, {
      id: "terminal",
      role: "now",
      lifecycle: connected ? "active" : "pending",
      confidence: connected ? "high" : "low",
      span: 12,
      title: "Farstone",
      html: transcriptHtml(transcript),
    }],
    trailingTiles: [{
      id: "command",
      role: "action",
      lifecycle: connected ? "active" : "pending",
      confidence: connected ? "high" : "low",
      span: 12,
      title: "Command",
      html: `<form id="farstone-command" class="mud-prompt"><label for="farstone-command-text" aria-label="Command prompt">&gt;</label><input id="farstone-command-text" name="command" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="help" ${connected ? "autofocus" : "disabled"}><button type="submit" ${connected ? "" : "disabled"}>Send</button></form>`,
    }],
    footerHtml: '<p><a href="https://play.561.group/">Return to the 561 Group game shelf</a></p>',
  };
}
