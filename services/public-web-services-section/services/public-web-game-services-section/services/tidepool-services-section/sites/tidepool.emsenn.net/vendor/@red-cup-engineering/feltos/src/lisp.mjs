import { contentsOf, move, placeOf, value } from "./world.mjs";

function fail(message) { throw new Error(message); }

export function readLisp(source) {
  if (typeof source !== "string") throw new TypeError("Lisp source must be text");
  const tokens = [...source.matchAll(/\s*(,@|[()']|"(?:\\.|[^"\\])*"|[^\s()']+)/gu)].map((match) => match[1]);
  let index = 0;
  function read() {
    const token = tokens[index++];
    if (token === undefined) fail("unexpected end of Lisp source");
    if (token === "(") {
      const list = [];
      while (tokens[index] !== ")") {
        if (tokens[index] === undefined) fail("unclosed Lisp list");
        list.push(read());
      }
      index += 1;
      return Object.freeze(list);
    }
    if (token === ")") fail("unexpected )");
    if (token === "'") return Object.freeze(["quote", read()]);
    if (token.startsWith('"')) return JSON.parse(token);
    if (/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u.test(token)) return Number(token);
    if (token === "true") return true;
    if (token === "false") return false;
    if (token === "nil") return null;
    return token;
  }
  const expression = read();
  if (index !== tokens.length) fail("trailing Lisp input");
  return expression;
}

export function runLisp(expression, context, { fuel = 1_000 } = {}) {
  let remaining = fuel;
  let world = context.world;
  const effects = [];
  function evaluate(form) {
    if (--remaining < 0) fail("Lisp fuel exhausted");
    if (!Array.isArray(form)) return form === "self" && context.self !== undefined ? context.self : form;
    if (form.length === 0) return null;
    const [operator, ...operands] = form;
    if (operator === "quote") return operands[0];
    if (operator === "if") return evaluate(operands[0]) ? evaluate(operands[1]) : evaluate(operands[2]);
    if (operator === "begin") { let result = null; for (const operand of operands) result = evaluate(operand); return result; }
    if (operator === "and") {
      let result = true;
      for (const operand of operands) { result = evaluate(operand); if (!result) return result; }
      return result;
    }
    if (operator === "or") {
      for (const operand of operands) { const result = evaluate(operand); if (result) return result; }
      return false;
    }
    if (operator === "not") return !evaluate(operands[0]);
    const args = operands.map(evaluate);
    if (operator === "+") return args.reduce((a, b) => a + b, 0);
    if (operator === "-") return args.slice(1).reduce((a, b) => a - b, args[0]);
    if (operator === "*") return args.reduce((a, b) => a * b, 1);
    if (operator === "/") return args.slice(1).reduce((a, b) => a / b, args[0]);
    if (operator === "=") return args.every((entry) => Object.is(entry, args[0]));
    if (operator === "<") return args.every((entry, index) => index === 0 || args[index - 1] < entry);
    if (operator === ">") return args.every((entry, index) => index === 0 || args[index - 1] > entry);
    if (operator === "value") return value(world, String(args[0]), String(args[1]));
    if (operator === "number") return Number(value(world, String(args[0]), String(args[1])) ?? 0);
    if (operator === "place") return placeOf(world, String(args[0]));
    if (operator === "contents") return contentsOf(world, String(args[0]));
    if (operator === "move") {
      world = move(world, String(args[0]), String(args[1]), { source: "feltos.lisp" });
      effects.push(Object.freeze({ kind: "move", subject: String(args[0]), destination: String(args[1]) }));
      return args[1];
    }
    fail(`unknown Lisp operator: ${String(operator)}`);
  }
  return Object.freeze({ value: evaluate(expression), world, effects: Object.freeze(effects), fuelUsed: fuel - remaining });
}
