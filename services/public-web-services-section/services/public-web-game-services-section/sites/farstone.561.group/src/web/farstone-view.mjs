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

function roomHtml(frame, connected) {
  const place = frame?.place;
  if (!connected || !place) {
    return '<p class="quiet">The island waits beyond the harbor bar. Give the watch a name and come ashore.</p>';
  }
  const occupants = (frame.occupants ?? []).map(({ name }) => name).filter(Boolean);
  const exits = place.exits ?? [];
  return [
    `<p class="room-name">${escapeHtml(place.name ?? "Somewhere")}</p>`,
    place.description ? `<p class="room-description">${escapeHtml(place.description)}</p>` : "",
    occupants.length ? `<p class="quiet">Also here: ${escapeHtml(occupants.join(", "))}.</p>` : "",
    exits.length
      ? `<p class="room-exits">${exits.map((exit) => `<button type="button" data-farstone-command="go ${escapeHtml(exit)}">${escapeHtml(exit)}</button>`).join("")}</p>`
      : '<p class="quiet">No obvious exits.</p>',
  ].join("");
}

// The tiling arrangement: transcript-over-command carries the left two
// thirds; watch-over-surroundings carries the right third. TUFTE's workspace
// keeps this a user-arrangeable starting point, not a fixed frame.
export const FARSTONE_WORKSPACE = {
  split: "row",
  sizes: [0.66, 0.34],
  children: [
    { split: "column", sizes: [0.84, 0.16], children: ["terminal", "command"] },
    { split: "column", sizes: [0.28, 0.72], children: ["connection", "room"] },
  ],
};

export function farstoneRoomOptions(frame, { connection = "disconnected", name = "", transcript = [] } = {}) {
  const connected = connection === "playing" || connection === "snapshot" || connection === "delta";
  const statusHtml = connected
    ? `<p><strong>${escapeHtml(name)}</strong> ashore at ${escapeHtml(frame?.place?.name ?? "the harbor bar")}<br><span class="quiet">tick ${Number(frame?.tick ?? 0)}</span></p>`
    : `<form id="farstone-connect"><label for="farstone-name">Name</label><input id="farstone-name" name="name" maxlength="24" value="${escapeHtml(name)}" required><button type="submit">Enter Farstone</button></form>`;
  return {
    title: "Farstone",
    subtitle: "A living harbor on the cold North Atlantic",
    eyebrow: "QwzSpace · TUFTE",
    tick: frame?.tick,
    entries: [],
    tileForEntry: () => [],
    workspace: FARSTONE_WORKSPACE,
    leadingTiles: [{
      id: "connection",
      role: "status",
      lifecycle: connected ? "active" : connection === "error" ? "stale" : "pending",
      confidence: connected ? "high" : "low",
      span: 12,
      title: connected ? "The watch" : connection === "error" ? "Connection interrupted" : "Come ashore",
      html: statusHtml,
    }, {
      id: "terminal",
      role: "now",
      lifecycle: connected ? "active" : "pending",
      confidence: connected ? "high" : "low",
      span: 12,
      title: "Transcript",
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
    }, {
      id: "room",
      role: "aside",
      lifecycle: connected ? "active" : "pending",
      confidence: connected ? "high" : "low",
      span: 12,
      title: "Surroundings",
      html: roomHtml(frame, connected),
    }],
    footerHtml: '<p>Drag the pane edges, or press Alt+Shift+Arrow inside a pane, to rearrange the deck. <a href="https://play.561.group/">Return to the 561 Group game shelf</a></p>',
  };
}
