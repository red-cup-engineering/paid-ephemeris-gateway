export type MudRoomView = Readonly<{
  room?: string;
  title?: string;
  description?: string;
  exits?: Record<string, string>;
  actors?: readonly string[];
  items?: readonly string[];
  vessels?: readonly string[];
}>;

export type MudPerceptionLine = Readonly<{
  at?: number;
  type?: string;
  text?: string;
  actor?: string;
  event?: Record<string, unknown>;
}>;

export type MudPerception = Readonly<{
  actor?: string;
  since?: number;
  through?: number;
  room?: string;
  lines?: readonly MudPerceptionLine[];
}>;

export type MudGmcpEvent = Readonly<{
  pkg: string;
  data: unknown;
}>;

export const mudActorStatusGmcp = (actor: string): MudGmcpEvent =>
  Object.freeze({ pkg: "Char.Status", data: Object.freeze({ name: actor }) });

export const mudCapabilitiesGmcp = (capabilities: unknown): MudGmcpEvent =>
  Object.freeze({ pkg: "Mud.Capabilities", data: capabilities });

export const mudQueueGmcp = (queue: unknown): MudGmcpEvent =>
  Object.freeze({ pkg: "Mud.Queue", data: queue });

export const mudEventGmcp = (event: Record<string, unknown>): MudGmcpEvent =>
  Object.freeze({ pkg: "Mud.Event", data: event });

export const mudPerceptionGmcp = (perception: MudPerception): MudGmcpEvent =>
  Object.freeze({ pkg: "Mud.Perception", data: perception });

export function mudRoomGmcp(room: MudRoomView | undefined): readonly MudGmcpEvent[] {
  if (room === undefined) return Object.freeze([]);
  const events: MudGmcpEvent[] = [
    Object.freeze({
      pkg: "Room.Info",
      data: Object.freeze({
        ...(room.room === undefined ? {} : { id: room.room }),
        ...(room.title === undefined ? {} : { name: room.title }),
        ...(room.description === undefined ? {} : { description: room.description }),
        ...(room.exits === undefined ? {} : { exits: room.exits }),
        ...(room.items === undefined ? {} : { items: room.items }),
        ...(room.vessels === undefined ? {} : { vessels: room.vessels }),
      }),
    }),
  ];
  if (room.actors !== undefined) {
    events.push(Object.freeze({
      pkg: "Room.Players",
      data: Object.freeze(room.actors.map((name) => Object.freeze({ name }))),
    }));
  }
  return Object.freeze(events);
}

export function mudPerceptionLines(perception: MudPerception): readonly string[] {
  return Object.freeze((perception.lines ?? []).flatMap((line) => typeof line.text === "string" ? [line.text] : []));
}

export function mudPerceptionThrough(perception: MudPerception, fallback: number): number {
  return Number.isInteger(perception.through) && typeof perception.through === "number" ? perception.through : fallback;
}

export function mudPerceptionSince(perception: boolean | Readonly<{ since?: number }> | undefined): number {
  if (!perception || perception === true) return 0;
  return Number.isInteger(perception.since) && typeof perception.since === "number" && perception.since >= 0 ? perception.since : 0;
}
