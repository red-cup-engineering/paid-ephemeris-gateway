export const IAC = 255;
export const DONT = 254;
export const DO = 253;
export const WONT = 252;
export const WILL = 251;
export const SB = 250;
export const SE = 240;
export const GA = 249;
export const EOR_MARK = 239;
export const COMPRESS2 = 86;
export const MXP = 91;
export const GMCP = 201;
export const MSDP = 69;
export const ECHO = 1;
export const SGA = 3;
export const EOR = 25;
export const TTYPE = 24;
export const NAWS = 31;
export const CHARSET = 42;
export const MSDP_VAR = 1;
export const MSDP_VAL = 2;
export const MSDP_TABLE_OPEN = 3;
export const MSDP_TABLE_CLOSE = 4;
export const MSDP_ARRAY_OPEN = 5;
export const MSDP_ARRAY_CLOSE = 6;

const enc = new TextEncoder();
const dec = new TextDecoder("utf8");
const SEND = 1;
const IS = 0;

export type TelnetSupports = {
  gmcp: boolean;
  msdp: boolean;
  mxp: boolean;
  sga: boolean;
  eor: boolean;
  echo: boolean;
  compress2: boolean;
  localEcho: boolean;
  naws?: boolean;
  ttype?: boolean;
};

export type ClientTelnet = ReturnType<typeof clientTelnet>;

export function bytesOf(value: unknown): Buffer {
  return Buffer.from(enc.encode(String(value)));
}

export function escapeIAC(buf: Uint8Array): Buffer {
  const out: number[] = [];
  for (const b of buf) {
    if (b === IAC) out.push(IAC);
    out.push(b);
  }
  return Buffer.from(out);
}

export function encodeMSDP(obj: Record<string, unknown>): Buffer {
  const out: number[] = [];
  const pushStr = (s: unknown): void => { for (const b of bytesOf(s)) out.push(b); };
  const pushVal = (value: unknown): void => {
    if (Array.isArray(value)) {
      out.push(MSDP_ARRAY_OPEN);
      for (const item of value) { out.push(MSDP_VAL); pushVal(item); }
      out.push(MSDP_ARRAY_CLOSE);
    } else if (value && typeof value === "object") {
      out.push(MSDP_TABLE_OPEN);
      for (const [k, v] of Object.entries(value)) { out.push(MSDP_VAR); pushStr(k); out.push(MSDP_VAL); pushVal(v); }
      out.push(MSDP_TABLE_CLOSE);
    } else {
      pushStr(value ?? "");
    }
  };
  for (const [k, v] of Object.entries(obj)) { out.push(MSDP_VAR); pushStr(k); out.push(MSDP_VAL); pushVal(v); }
  return Buffer.from(out);
}

export function parseMSDP(bytes: Uint8Array): Record<string, unknown> {
  const buf = Buffer.from(bytes);
  let i = 0;
  const readString = (): string => {
    const start = i;
    while (i < buf.length && ![MSDP_VAR, MSDP_VAL, MSDP_TABLE_OPEN, MSDP_TABLE_CLOSE, MSDP_ARRAY_OPEN, MSDP_ARRAY_CLOSE].includes(buf[i] ?? -1)) i += 1;
    return dec.decode(buf.subarray(start, i));
  };
  const readArray = (): unknown[] => {
    const arr: unknown[] = [];
    while (i < buf.length && buf[i] !== MSDP_ARRAY_CLOSE) {
      if (buf[i] === MSDP_VAL) { i += 1; arr.push(readValue()); }
      else i += 1;
    }
    if (buf[i] === MSDP_ARRAY_CLOSE) i += 1;
    return arr;
  };
  const readTable = (): Record<string, unknown> => {
    const obj: Record<string, unknown> = {};
    while (i < buf.length && buf[i] !== MSDP_TABLE_CLOSE) {
      if (buf[i] === MSDP_VAR) {
        i += 1;
        const key = readString();
        if (buf[i] === MSDP_VAL) i += 1;
        obj[key] = readValue();
      } else {
        i += 1;
      }
    }
    if (buf[i] === MSDP_TABLE_CLOSE) i += 1;
    return obj;
  };
  const readValue = (): unknown => {
    if (buf[i] === MSDP_TABLE_OPEN) { i += 1; return readTable(); }
    if (buf[i] === MSDP_ARRAY_OPEN) { i += 1; return readArray(); }
    return readString();
  };
  return readTable();
}

export function clientTelnet(options: {
  write?: (bytes: Buffer) => void;
  naws?: { width: number; height: number };
  ttype?: string;
  accept?: { serverWill?: readonly number[]; serverDo?: readonly number[] };
} = {}) {
  const write = options.write ?? (() => {});
  const naws = options.naws ?? { width: 80, height: 24 };
  const ttype = options.ttype ?? "TERMINAL-INTERFACE";
  const acceptWill = new Set([GMCP, MSDP, MXP, SGA, EOR, ECHO, ...(options.accept?.serverWill ?? [])]);
  const acceptDo = new Set([NAWS, TTYPE, SGA, ...(options.accept?.serverDo ?? [])]);
  const supports: TelnetSupports = { gmcp: false, msdp: false, mxp: false, sga: false, eor: false, echo: false, compress2: false, localEcho: true };

  const lineHandlers = new Set<(line: string) => void>();
  const promptHandlers = new Set<(prompt: string) => void>();
  const gmcpHandlers = new Set<(pkg: string, data: unknown) => void>();
  const msdpHandlers = new Set<(obj: Record<string, unknown>) => void>();
  const negotiateHandlers = new Set<(supports: TelnetSupports) => void>();
  const cmd = (verb: number, option: number): void => write(Buffer.from([IAC, verb, option]));
  const sub = (option: number, payload: Uint8Array | string): void => {
    const p = typeof payload === "string" ? bytesOf(payload) : Buffer.from(payload);
    write(Buffer.concat([Buffer.from([IAC, SB, option]), escapeIAC(p), Buffer.from([IAC, SE])]));
  };
  const emitNegotiate = (): void => fan(negotiateHandlers, { ...supports });

  let lineBuf: number[] = [];
  let state: "data" | "iac" | "verb" | "sb-opt" | "sb" | "sbiac" = "data";
  let verb = 0;
  let sbOption = 0;
  let sbBuf: number[] = [];

  const flushLine = (): void => {
    const line = dec.decode(Buffer.from(lineBuf));
    lineBuf = [];
    fan(lineHandlers, line);
  };
  const flushPrompt = (): void => {
    if (lineBuf.length === 0) return;
    const prompt = dec.decode(Buffer.from(lineBuf));
    lineBuf = [];
    fan(promptHandlers, prompt);
  };
  const sendNAWS = (w = naws.width, h = naws.height): void => {
    sub(NAWS, Buffer.from([(w >> 8) & 255, w & 255, (h >> 8) & 255, h & 255]));
  };
  const sendGMCP = (pkg: string, data?: unknown): void => {
    if (!supports.gmcp) return;
    sub(GMCP, data === undefined ? pkg : `${pkg} ${JSON.stringify(data)}`);
  };
  const helloGMCP = (): void => {
    sendGMCP("Core.Hello", { client: "terminal-interface", version: "0.0.1" });
    sendGMCP("Core.Supports.Set", ["Char 1", "Room 1", "Comm 1"]);
  };

  const onWill = (option: number): void => {
    if (option === COMPRESS2) { cmd(DONT, COMPRESS2); supports.compress2 = false; return; }
    if (!acceptWill.has(option)) { cmd(DONT, option); return; }
    cmd(DO, option);
    if (option === GMCP) { supports.gmcp = true; emitNegotiate(); helloGMCP(); }
    else if (option === MSDP) { supports.msdp = true; emitNegotiate(); }
    else if (option === MXP) { supports.mxp = true; emitNegotiate(); }
    else if (option === SGA) { supports.sga = true; emitNegotiate(); }
    else if (option === EOR) { supports.eor = true; emitNegotiate(); }
    else if (option === ECHO) { supports.echo = true; supports.localEcho = false; emitNegotiate(); }
  };
  const onWont = (option: number): void => {
    if (option === GMCP) supports.gmcp = false;
    else if (option === MSDP) supports.msdp = false;
    else if (option === MXP) supports.mxp = false;
    else if (option === SGA) supports.sga = false;
    else if (option === EOR) supports.eor = false;
    else if (option === ECHO) { supports.echo = false; supports.localEcho = true; }
    else return;
    emitNegotiate();
  };
  const onDo = (option: number): void => {
    if (!acceptDo.has(option)) { cmd(WONT, option); return; }
    cmd(WILL, option);
    if (option === NAWS) { supports.naws = true; sendNAWS(); }
    else if (option === TTYPE) supports.ttype = true;
    else if (option === SGA) supports.sga = true;
  };
  const onDont = (option: number): void => {
    if (option === NAWS) delete supports.naws;
    else if (option === TTYPE) delete supports.ttype;
    else if (option === SGA) supports.sga = false;
  };
  const dispatchSB = (option: number, payload: number[]): void => {
    if (option === GMCP) {
      const text = dec.decode(Buffer.from(payload));
      const sp = text.indexOf(" ");
      const pkg = sp === -1 ? text : text.slice(0, sp);
      const json = sp === -1 ? "" : text.slice(sp + 1);
      let data: unknown = null;
      if (json.trim()) {
        try { data = JSON.parse(json) as unknown; }
        catch { data = json; }
      }
      fan(gmcpHandlers, pkg, data);
    } else if (option === MSDP) {
      fan(msdpHandlers, parseMSDP(Buffer.from(payload)));
    } else if (option === TTYPE && payload[0] === SEND) {
      sub(TTYPE, Buffer.concat([Buffer.from([IS]), bytesOf(ttype)]));
    }
  };

  const feed = (chunk: Uint8Array | string): void => {
    const buf = typeof chunk === "string" ? bytesOf(chunk) : Buffer.from(chunk);
    for (const b of buf) {
      switch (state) {
        case "data":
          if (b === IAC) state = "iac";
          else if (b === 13) { /* wait for LF */ }
          else if (b === 10) flushLine();
          else lineBuf.push(b);
          break;
        case "iac":
          if (b === IAC) { lineBuf.push(IAC); state = "data"; }
          else if (b === WILL || b === WONT || b === DO || b === DONT) { verb = b; state = "verb"; }
          else if (b === SB) state = "sb-opt";
          else if (b === GA || b === EOR_MARK) { flushPrompt(); state = "data"; }
          else state = "data";
          break;
        case "verb":
          if (verb === WILL) onWill(b);
          else if (verb === WONT) onWont(b);
          else if (verb === DO) onDo(b);
          else if (verb === DONT) onDont(b);
          state = "data";
          break;
        case "sb-opt":
          sbOption = b;
          sbBuf = [];
          state = "sb";
          break;
        case "sb":
          if (b === IAC) state = "sbiac";
          else sbBuf.push(b);
          break;
        case "sbiac":
          if (b === IAC) { sbBuf.push(IAC); state = "sb"; }
          else if (b === SE) { dispatchSB(sbOption, sbBuf); sbBuf = []; state = "data"; }
          else state = "data";
          break;
      }
    }
  };

  const send = (text: string): void => write(escapeIAC(bytesOf(text.replace(/\r?\n/g, "\r\n"))));
  const sendLine = (text: string): void => write(escapeIAC(bytesOf(`${text.replace(/\r?\n/g, "\r\n")}\r\n`)));

  return {
    feed,
    onLine: (cb: (line: string) => void) => subscribe(lineHandlers, cb),
    onPrompt: (cb: (prompt: string) => void) => subscribe(promptHandlers, cb),
    onGMCP: (cb: (pkg: string, data: unknown) => void) => subscribe(gmcpHandlers, cb),
    onMSDP: (cb: (obj: Record<string, unknown>) => void) => subscribe(msdpHandlers, cb),
    onNegotiate: (cb: (supports: TelnetSupports) => void) => subscribe(negotiateHandlers, cb),
    send,
    sendLine,
    sendGMCP,
    sendNAWS,
    supports,
  };
}

function subscribe<T extends (...args: never[]) => unknown>(set: Set<T>, cb: T): () => void {
  set.add(cb);
  return () => { set.delete(cb); };
}

function fan<T extends (...args: never[]) => unknown>(set: Set<T>, ...args: Parameters<T>): void {
  for (const cb of set) {
    try { cb(...args); }
    catch { /* isolate handlers */ }
  }
}
