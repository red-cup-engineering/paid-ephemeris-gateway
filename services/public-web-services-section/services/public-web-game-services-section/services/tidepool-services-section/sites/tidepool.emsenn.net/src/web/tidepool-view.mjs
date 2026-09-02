function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function transcriptHtml(lines) {
  const content = lines.length > 0
    ? lines.map((line) => `<div class="mud-line mud-line--${escapeHtml(line.kind ?? "output")}">${escapeHtml(line.text)}</div>`).join("")
    : '<div class="mud-line quiet">Choose a name to wade into Tidepool.</div>';
  return `<div id="tidepool-transcript" class="mud-transcript" role="log" aria-live="polite" aria-relevant="additions text" tabindex="0">${content}</div>`;
}

function clockLine(clock) {
  if (!clock) return "";
  const dryStreak = clock.dryStreak > 0 ? ` · ${clock.dryStreak}t since rain` : "";
  return `<p class="quiet">${escapeHtml(clock.phase)}, ${escapeHtml(clock.season)} · tide ${escapeHtml(clock.tide)} · ${escapeHtml(clock.weather)}${dryStreak}</p>`;
}

function roomHtml(frame, connected) {
  const place = frame?.place;
  if (!connected || !place) {
    return '<p class="quiet">The pools wait past the tideline. Give the shore a name and wade in.</p>';
  }
  const occupants = (frame.occupants ?? []).map(({ name }) => name).filter(Boolean);
  const exits = place.exits ?? [];
  const here = (frame.subjects ?? []).find((subject) => subject.id === place.id);
  const affordances = here?.affordances ?? [];
  return [
    `<p class="room-name">${escapeHtml(place.name ?? "Somewhere")}</p>`,
    place.description ? `<p class="room-description">${escapeHtml(place.description)}</p>` : "",
    clockLine(frame.clock),
    occupants.length ? `<p class="quiet">Also here: ${escapeHtml(occupants.join(", "))}.</p>` : "",
    exits.length
      ? `<p class="room-exits">${exits.map((exit) => `<button type="button" data-tidepool-command="go ${escapeHtml(exit)}">${escapeHtml(exit)}</button>`).join("")}</p>`
      : '<p class="quiet">No obvious exits.</p>',
    affordances.length
      ? `<p class="quiet">You can: ${affordances.map((verb) => `<button type="button" class="verb" data-tidepool-command="${escapeHtml(verb)}">${escapeHtml(verb)}</button>`).join(" ")}</p>`
      : "",
  ].join("");
}

// Transcript-over-command carries the left two thirds; watch-over-surroundings carries the
// right third — same tiling as Farstone's own workspace (farstone-view.mjs), TUFTE's workspace
// keeps this a user-arrangeable starting point, not a fixed frame.
export const TIDEPOOL_WORKSPACE = {
  split: "row",
  sizes: [0.66, 0.34],
  children: [
    { split: "column", sizes: [0.84, 0.16], children: ["terminal", "command"] },
    { split: "column", sizes: [0.28, 0.72], children: ["connection", "room"] },
  ],
};

export function tidepoolRoomOptions(frame, { connection = "disconnected", name = "", transcript = [] } = {}) {
  const connected = connection === "playing" || connection === "snapshot" || connection === "delta";
  const statusHtml = connected
    ? `<p><strong>${escapeHtml(name)}</strong> at ${escapeHtml(frame?.place?.name ?? "the tideline")}<br><span class="quiet">tick ${Number(frame?.tick ?? 0)}</span></p>`
    : `<form id="tidepool-connect"><label for="tidepool-name">Name</label><input id="tidepool-name" name="name" maxlength="24" value="${escapeHtml(name)}" required><button type="submit">Wade into Tidepool</button></form>`;
  return {
    title: "Tidepool",
    subtitle: "A tidal shore for agents and humans alike",
    eyebrow: "QwzSpace · TUFTE",
    tick: frame?.tick,
    entries: [],
    tileForEntry: () => [],
    workspace: TIDEPOOL_WORKSPACE,
    leadingTiles: [{
      id: "connection",
      role: "status",
      lifecycle: connected ? "active" : connection === "error" ? "stale" : "pending",
      confidence: connected ? "high" : "low",
      span: 12,
      title: connected ? "The tide" : connection === "error" ? "Connection interrupted" : "Come ashore",
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
      html: `<form id="tidepool-command" class="mud-prompt"><label for="tidepool-command-text" aria-label="Command prompt">&gt;</label><input id="tidepool-command-text" name="command" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="look" ${connected ? "autofocus" : "disabled"}><button type="submit" ${connected ? "" : "disabled"}>Send</button></form>`,
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
