import type { KqlAggregate, KqlExpression, KqlOperator, KqlProjection, KqlQueryAst, KqlResult, KqlRow, KqlScalar, KqlTables } from "@/lib/kql/types";

export type KqlErrorCode = "SyntaxError" | "UnknownTable" | "UnknownColumn" | "TypeError" | "UnsupportedOperator";

export class KqlError extends Error {
  constructor(public readonly code: KqlErrorCode, message: string) {
    super(message);
    this.name = "KqlError";
  }
}

type Token = { type: "identifier" | "number" | "string" | "operator" | "lparen" | "rparen" | "comma" | "eof"; value: string };

function lexExpression(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const char = input[i];
    if (/\s/.test(char)) { i += 1; continue; }
    if (char === "'" || char === '"') {
      const quote = char;
      let value = "";
      i += 1;
      let closed = false;
      while (i < input.length) {
        if (input[i] === "\\" && i + 1 < input.length) { value += input[i + 1]; i += 2; continue; }
        if (input[i] === quote) { i += 1; closed = true; break; }
        value += input[i]; i += 1;
      }
      if (!closed) throw new KqlError("SyntaxError", "Unterminated string literal.");
      tokens.push({ type: "string", value });
      continue;
    }
    if (/\d/.test(char) || (char === "." && /\d/.test(input[i + 1] ?? ""))) {
      let value = "";
      while (i < input.length && /[\d.]/.test(input[i])) { value += input[i]; i += 1; }
      if (!/^\d+(?:\.\d+)?$|^\.\d+$/.test(value)) throw new KqlError("SyntaxError", `Invalid numeric literal '${value}'.`);
      tokens.push({ type: "number", value });
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let value = "";
      while (i < input.length && /[A-Za-z0-9_.$]/.test(input[i])) { value += input[i]; i += 1; }
      tokens.push({ type: "identifier", value });
      continue;
    }
    const two = input.slice(i, i + 2);
    if (["==", "!=", ">=", "<="].includes(two)) { tokens.push({ type: "operator", value: two }); i += 2; continue; }
    if ([">", "<", "+", "-", "*", "/"].includes(char)) { tokens.push({ type: "operator", value: char }); i += 1; continue; }
    if (char === "(") { tokens.push({ type: "lparen", value: char }); i += 1; continue; }
    if (char === ")") { tokens.push({ type: "rparen", value: char }); i += 1; continue; }
    if (char === ",") { tokens.push({ type: "comma", value: char }); i += 1; continue; }
    throw new KqlError("SyntaxError", `Unexpected character '${char}'.`);
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}

class ExpressionParser {
  private index = 0;
  constructor(private readonly tokens: Token[]) {}
  private peek() { return this.tokens[this.index]; }
  private take() { return this.tokens[this.index++]; }
  private match(type: Token["type"], value?: string) {
    const token = this.peek();
    if (token.type !== type || (value !== undefined && token.value.toLowerCase() !== value.toLowerCase())) return false;
    this.index += 1;
    return true;
  }
  parse() {
    const expression = this.parseOr();
    if (this.peek().type !== "eof") throw new KqlError("SyntaxError", `Unexpected token '${this.peek().value}'.`);
    return expression;
  }
  private parseOr(): KqlExpression {
    let left = this.parseAnd();
    while (this.peek().type === "identifier" && this.peek().value.toLowerCase() === "or") { this.take(); left = { kind: "binary", op: "or", left, right: this.parseAnd() }; }
    return left;
  }
  private parseAnd(): KqlExpression {
    let left = this.parseComparison();
    while (this.peek().type === "identifier" && this.peek().value.toLowerCase() === "and") { this.take(); left = { kind: "binary", op: "and", left, right: this.parseComparison() }; }
    return left;
  }
  private parseComparison(): KqlExpression {
    let left = this.parseAdditive();
    const token = this.peek();
    const keyword = token.type === "identifier" ? token.value.toLowerCase() : token.value;
    if (["==", "!=", ">", ">=", "<", "<=", "contains", "startswith", "endswith"].includes(keyword)) {
      this.take();
      left = { kind: "binary", op: keyword as Extract<KqlExpression, { kind: "binary" }>["op"], left, right: this.parseAdditive() };
    }
    return left;
  }
  private parseAdditive(): KqlExpression {
    let left = this.parseMultiplicative();
    while (this.peek().type === "operator" && ["+", "-"].includes(this.peek().value)) {
      const op = this.take().value as "+" | "-";
      left = { kind: "binary", op, left, right: this.parseMultiplicative() };
    }
    return left;
  }
  private parseMultiplicative(): KqlExpression {
    let left = this.parseUnary();
    while (this.peek().type === "operator" && ["*", "/"].includes(this.peek().value)) {
      const op = this.take().value as "*" | "/";
      left = { kind: "binary", op, left, right: this.parseUnary() };
    }
    return left;
  }
  private parseUnary(): KqlExpression {
    if (this.peek().type === "identifier" && this.peek().value.toLowerCase() === "not") { this.take(); return { kind: "unary", op: "not", expression: this.parseUnary() }; }
    if (this.match("operator", "-")) return { kind: "unary", op: "-", expression: this.parseUnary() };
    return this.parsePrimary();
  }
  private parsePrimary(): KqlExpression {
    const token = this.take();
    if (token.type === "number") return { kind: "literal", value: Number(token.value) };
    if (token.type === "string") return { kind: "literal", value: token.value };
    if (token.type === "identifier") {
      const lower = token.value.toLowerCase();
      if (lower === "true" || lower === "false") return { kind: "literal", value: lower === "true" };
      if (lower === "null") return { kind: "literal", value: null };
      if (this.match("lparen")) {
        if (!["datetime", "tostring", "tolower", "toupper"].includes(lower)) throw new KqlError("UnsupportedOperator", `Function '${token.value}' is not supported.`);
        const args: KqlExpression[] = [];
        if (!this.match("rparen")) {
          while (true) {
            args.push(this.parseOr());
            if (this.match("rparen")) break;
            if (!this.match("comma")) throw new KqlError("SyntaxError", "Expected ',' or ')' in function call.");
          }
        }
        return { kind: "call", name: lower as Extract<KqlExpression, { kind: "call" }>["name"], args };
      }
      return { kind: "column", name: token.value };
    }
    if (token.type === "lparen") {
      const expression = this.parseOr();
      if (!this.match("rparen")) throw new KqlError("SyntaxError", "Expected ')'.");
      return expression;
    }
    throw new KqlError("SyntaxError", `Unexpected token '${token.value}'.`);
  }
}

export function parseKqlExpression(input: string) {
  return new ExpressionParser(lexExpression(input)).parse();
}

function splitTopLevel(input: string, delimiter: string) {
  const parts: string[] = [];
  let current = "";
  let quote: string | null = null;
  let depth = 0;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quote) {
      current += char;
      if (char === "\\" && i + 1 < input.length) { current += input[i + 1]; i += 1; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') { quote = char; current += char; continue; }
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (depth < 0) throw new KqlError("SyntaxError", "Unbalanced parentheses.");
    if (depth === 0 && input.slice(i, i + delimiter.length) === delimiter) {
      parts.push(current.trim()); current = ""; i += delimiter.length - 1; continue;
    }
    current += char;
  }
  if (quote || depth !== 0) throw new KqlError("SyntaxError", "Unbalanced quotes or parentheses.");
  parts.push(current.trim());
  return parts.filter(Boolean);
}

function findTopLevelKeyword(input: string, keyword: string) {
  let quote: string | null = null;
  let depth = 0;
  const lower = input.toLowerCase();
  for (let i = 0; i <= input.length - keyword.length; i += 1) {
    const char = input[i];
    if (quote) {
      if (char === "\\") { i += 1; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (char === "(") { depth += 1; continue; }
    if (char === ")") { depth -= 1; continue; }
    if (depth === 0 && lower.slice(i, i + keyword.length) === keyword) return i;
  }
  return -1;
}

function parseProjectionList(input: string): KqlProjection[] {
  return splitTopLevel(input, ",").map((item, index) => {
    const equal = findTopLevelKeyword(item, "=");
    if (equal > 0) {
      const name = item.slice(0, equal).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new KqlError("SyntaxError", `Invalid output column '${name}'.`);
      return { name, expression: parseKqlExpression(item.slice(equal + 1).trim()) };
    }
    const expression = parseKqlExpression(item);
    return { name: expression.kind === "column" ? expression.name : `Column${index + 1}`, expression };
  });
}

function parseAggregateList(input: string): KqlAggregate[] {
  return splitTopLevel(input, ",").map((item, index) => {
    const match = item.match(/^\s*(?:([A-Za-z_][A-Za-z0-9_]*)\s*=\s*)?(count|sum|avg|min|max)\s*\((.*?)\)\s*$/i);
    if (!match) throw new KqlError("SyntaxError", `Invalid summarize aggregate '${item}'.`);
    const fn = match[2].toLowerCase() as KqlAggregate["fn"];
    const expressionText = match[3].trim();
    if (fn !== "count" && !expressionText) throw new KqlError("SyntaxError", `${fn}() requires an expression.`);
    if (fn === "count" && expressionText) throw new KqlError("SyntaxError", "count() does not accept an argument in this KQL subset.");
    return { name: match[1] ?? (fn === "count" ? "Count" : `${fn}_${index + 1}`), fn, expression: expressionText ? parseKqlExpression(expressionText) : undefined };
  });
}

export function parseKql(query: string): KqlQueryAst {
  const segments = splitTopLevel(query.trim(), "|");
  if (!segments.length) throw new KqlError("SyntaxError", "Query is empty.");
  const table = segments[0].trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new KqlError("SyntaxError", `Invalid table name '${table}'.`);
  const operators: KqlOperator[] = [];
  for (const raw of segments.slice(1)) {
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("where ")) { operators.push({ kind: "where", expression: parseKqlExpression(trimmed.slice(6)) }); continue; }
    if (lower.startsWith("project-away ")) { operators.push({ kind: "project-away", columns: splitTopLevel(trimmed.slice(13), ",").map((x) => x.trim()) }); continue; }
    if (lower.startsWith("project ")) { operators.push({ kind: "project", items: parseProjectionList(trimmed.slice(8)) }); continue; }
    if (lower.startsWith("extend ")) { operators.push({ kind: "extend", items: parseProjectionList(trimmed.slice(7)) }); continue; }
    if (lower.startsWith("sort by ") || lower.startsWith("order by ")) {
      const body = trimmed.slice(trimmed.indexOf("by") + 2).trim();
      const items = splitTopLevel(body, ",").map((item) => {
        const match = item.match(/^(.*?)(?:\s+(asc|desc))?$/i)!;
        return { expression: parseKqlExpression(match[1].trim()), direction: (match[2]?.toLowerCase() ?? "asc") as "asc" | "desc" };
      });
      operators.push({ kind: "sort", items }); continue;
    }
    if (lower.startsWith("take ") || lower.startsWith("limit ")) {
      const count = Number(trimmed.split(/\s+/)[1]);
      if (!Number.isInteger(count) || count < 0) throw new KqlError("SyntaxError", "take/limit requires a non-negative integer.");
      operators.push({ kind: "take", count }); continue;
    }
    if (lower === "count") { operators.push({ kind: "count" }); continue; }
    if (lower.startsWith("distinct ")) { operators.push({ kind: "distinct", items: parseProjectionList(trimmed.slice(9)) }); continue; }
    if (lower.startsWith("top ")) {
      const match = trimmed.match(/^top\s+(\d+)\s+by\s+(.+?)(?:\s+(asc|desc))?$/i);
      if (!match) throw new KqlError("SyntaxError", "Expected `top <N> by <expression> [asc|desc]`." );
      operators.push({ kind: "top", count: Number(match[1]), expression: parseKqlExpression(match[2]), direction: (match[3]?.toLowerCase() ?? "desc") as "asc" | "desc" }); continue;
    }
    if (lower.startsWith("summarize ") || lower === "summarize") {
      const body = trimmed.slice("summarize".length).trim();
      if (!body) throw new KqlError("SyntaxError", "summarize requires at least one aggregate.");
      const byIndex = findTopLevelKeyword(body.toLowerCase(), " by ");
      const aggregatesText = byIndex >= 0 ? body.slice(0, byIndex).trim() : body;
      const byText = byIndex >= 0 ? body.slice(byIndex + 4).trim() : "";
      operators.push({ kind: "summarize", aggregates: parseAggregateList(aggregatesText), by: byText ? parseProjectionList(byText) : [] }); continue;
    }
    throw new KqlError("UnsupportedOperator", `Unsupported KQL operator '${trimmed.split(/\s+/)[0]}'.`);
  }
  return { table, operators };
}

function getColumn(row: KqlRow, name: string): KqlScalar {
  if (!(name in row)) throw new KqlError("UnknownColumn", `Column '${name}' does not exist.`);
  return row[name];
}
function numeric(value: KqlScalar, context: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new KqlError("TypeError", `${context} requires numeric values.`);
  return value;
}
function compareValue(value: KqlScalar) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const time = Date.parse(value);
    if (!Number.isNaN(time)) return time;
  }
  return value;
}
function truthy(value: KqlScalar) {
  if (typeof value !== "boolean") throw new KqlError("TypeError", "Boolean expression expected.");
  return value;
}

export function evaluateKqlExpression(expression: KqlExpression, row: KqlRow): KqlScalar {
  if (expression.kind === "literal") return expression.value;
  if (expression.kind === "column") return getColumn(row, expression.name);
  if (expression.kind === "unary") {
    const value = evaluateKqlExpression(expression.expression, row);
    return expression.op === "not" ? !truthy(value) : -numeric(value, "Unary minus");
  }
  if (expression.kind === "call") {
    const args = expression.args.map((arg) => evaluateKqlExpression(arg, row));
    if (expression.name === "datetime") {
      if (args.length !== 1 || typeof args[0] !== "string" || Number.isNaN(Date.parse(args[0]))) throw new KqlError("TypeError", "datetime() expects one valid date/time string.");
      return new Date(args[0]).toISOString();
    }
    if (expression.name === "tostring") {
      if (args.length !== 1) throw new KqlError("TypeError", "tostring() expects one argument.");
      return args[0] === null ? "" : String(args[0]);
    }
    if (args.length !== 1 || typeof args[0] !== "string") throw new KqlError("TypeError", `${expression.name}() expects one string argument.`);
    return expression.name === "tolower" ? args[0].toLowerCase() : args[0].toUpperCase();
  }
  const op = expression.op;
  if (op === "and") return truthy(evaluateKqlExpression(expression.left, row)) && truthy(evaluateKqlExpression(expression.right, row));
  if (op === "or") return truthy(evaluateKqlExpression(expression.left, row)) || truthy(evaluateKqlExpression(expression.right, row));
  const left = evaluateKqlExpression(expression.left, row);
  const right = evaluateKqlExpression(expression.right, row);
  if (["+", "-", "*", "/"].includes(op)) {
    const a = numeric(left, `Operator ${op}`);
    const b = numeric(right, `Operator ${op}`);
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (b === 0) throw new KqlError("TypeError", "Division by zero.");
    return a / b;
  }
  if (["contains", "startswith", "endswith"].includes(op)) {
    if (typeof left !== "string" || typeof right !== "string") throw new KqlError("TypeError", `${op} requires string values.`);
    const a = left.toLowerCase(); const b = right.toLowerCase();
    return op === "contains" ? a.includes(b) : op === "startswith" ? a.startsWith(b) : a.endsWith(b);
  }
  const a = compareValue(left); const b = compareValue(right);
  if (op === "==") return a === b;
  if (op === "!=") return a !== b;
  if ((typeof a !== "number" && typeof a !== "string") || (typeof b !== "number" && typeof b !== "string")) throw new KqlError("TypeError", `Operator ${op} requires comparable values.`);
  if (op === ">") return a > b;
  if (op === ">=") return a >= b;
  if (op === "<") return a < b;
  return a <= b;
}

function projectRow(row: KqlRow, items: KqlProjection[]) {
  const output: KqlRow = {};
  for (const item of items) output[item.name] = evaluateKqlExpression(item.expression, row);
  return output;
}
function scalarSort(value: KqlScalar) {
  return compareValue(value) ?? "";
}
function compareScalars(a: KqlScalar, b: KqlScalar) {
  const left = scalarSort(a); const right = scalarSort(b);
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
function aggregateRows(rows: KqlRow[], aggregate: KqlAggregate): KqlScalar {
  if (aggregate.fn === "count") return rows.length;
  const values = rows.map((row) => evaluateKqlExpression(aggregate.expression!, row));
  const numbers = values.map((value) => numeric(value, `${aggregate.fn}()`));
  if (!numbers.length) return aggregate.fn === "sum" ? 0 : null;
  if (aggregate.fn === "sum") return numbers.reduce((a, b) => a + b, 0);
  if (aggregate.fn === "avg") return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  if (aggregate.fn === "min") return Math.min(...numbers);
  return Math.max(...numbers);
}

export function executeKql(tables: KqlTables, query: string): KqlResult {
  const started = performance.now();
  const ast = parseKql(query);
  const source = tables[ast.table];
  if (!source) throw new KqlError("UnknownTable", `Table '${ast.table}' does not exist.`);
  let rows = source.map((row) => ({ ...row }));

  for (const operator of ast.operators) {
    if (operator.kind === "where") { rows = rows.filter((row) => truthy(evaluateKqlExpression(operator.expression, row))); continue; }
    if (operator.kind === "project") { rows = rows.map((row) => projectRow(row, operator.items)); continue; }
    if (operator.kind === "project-away") { rows = rows.map((row) => { const copy = { ...row }; for (const column of operator.columns) { if (!(column in copy)) throw new KqlError("UnknownColumn", `Column '${column}' does not exist.`); delete copy[column]; } return copy; }); continue; }
    if (operator.kind === "extend") { rows = rows.map((row) => ({ ...row, ...projectRow(row, operator.items) })); continue; }
    if (operator.kind === "sort") { rows = [...rows].sort((a, b) => { for (const item of operator.items) { const cmp = compareScalars(evaluateKqlExpression(item.expression, a), evaluateKqlExpression(item.expression, b)); if (cmp) return item.direction === "asc" ? cmp : -cmp; } return 0; }); continue; }
    if (operator.kind === "take") { rows = rows.slice(0, operator.count); continue; }
    if (operator.kind === "count") { rows = [{ Count: rows.length }]; continue; }
    if (operator.kind === "distinct") { const seen = new Set<string>(); const output: KqlRow[] = []; for (const row of rows) { const projected = projectRow(row, operator.items); const key = JSON.stringify(projected); if (!seen.has(key)) { seen.add(key); output.push(projected); } } rows = output; continue; }
    if (operator.kind === "top") { rows = [...rows].sort((a, b) => compareScalars(evaluateKqlExpression(operator.expression, a), evaluateKqlExpression(operator.expression, b)) * (operator.direction === "asc" ? 1 : -1)).slice(0, operator.count); continue; }
    if (operator.kind === "summarize") {
      const groups = new Map<string, { keys: KqlRow; rows: KqlRow[] }>();
      if (!operator.by.length) groups.set("[]", { keys: {}, rows });
      else for (const row of rows) { const keys = projectRow(row, operator.by); const key = JSON.stringify(keys); const existing = groups.get(key); if (existing) existing.rows.push(row); else groups.set(key, { keys, rows: [row] }); }
      rows = [...groups.values()].map((group) => { const output: KqlRow = { ...group.keys }; for (const aggregate of operator.aggregates) output[aggregate.name] = aggregateRows(group.rows, aggregate); return output; });
      continue;
    }
  }

  const columns = rows.length ? Object.keys(rows[0]) : [];
  return { rows, columns, rowCount: rows.length, executionMs: Math.max(0, Math.round((performance.now() - started) * 100) / 100), ast };
}

export const KQL_SUPPORTED_OPERATORS = ["where", "project", "project-away", "extend", "sort", "order", "take", "limit", "summarize", "count", "distinct", "top"] as const;
