// farstone-session — a RECORDED session fixture. The shapes here (POST /connect's {actor}, GET
// /events's {events:[{kind:"fizzos.message.v1",to,channel,text}]}) match the live route table
// (`@red-cup-engineering/fizzos/http`, vendored into the farstone.emsenn.net tree) byte-for-byte,
// captured from a polite probe session against the deployed `https://farstone.561.group` on
// 2026-08-19 and replayed here so the render test is deterministic — no live network, no real
// elapsed wall-clock ticks, the same output every run.

export const CONNECT_RESPONSE = { actor: "actor:wheatstone-fixture-8f3c1a" };

// One entry per GET /events?actor= response, consumed IN ORDER as fake-farstone-server.mjs serves
// each poll — this is the shape of a real multi-poll session: a room description arrives as one
// multi-line fizzos.message.v1 event, some polls drain nothing (the world was quiet), and a reply
// to a sent command arrives on a later poll (the command only takes effect at Farstone's next tick;
// see src/world.mjs's header).
export const EVENTS_SEQUENCE = [
  {
    events: [
      {
        kind: "fizzos.message.v1",
        to: CONNECT_RESPONSE.actor,
        channel: "room",
        text: "You are standing on the wharf. Salt wind off the harbor.\nExits: north, east.",
      },
    ],
  },
  { events: [] },
  {
    events: [
      { kind: "fizzos.message.v1", to: CONNECT_RESPONSE.actor, channel: "ambient", text: "A gull cries overhead." },
    ],
  },
  {
    events: [
      { kind: "fizzos.message.v1", to: CONNECT_RESPONSE.actor, channel: "look", text: "The chandlery is shuttered for the night." },
    ],
  },
];
