import type { ParsedAwsCommand } from "@/lib/simulators/aws/types";

export class AwsCliParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AwsCliParseError";
  }
}

export function tokenizeAwsCommand(input: string) {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const char of input.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaping || quote) throw new AwsCliParseError("Unterminated escape or quoted value.");
  if (current) tokens.push(current);
  return tokens;
}

export function parseAwsCommand(input: string): ParsedAwsCommand {
  if (!input.trim()) throw new AwsCliParseError("Command is empty.");
  const tokens = tokenizeAwsCommand(input);
  if (tokens[0] !== "aws") throw new AwsCliParseError("Commands must start with `aws`.");
  if (tokens.length < 3) throw new AwsCliParseError("Expected `aws <service> <operation>`." );

  const service = tokens[1].toLowerCase();
  const operation = tokens[2].toLowerCase();
  const options: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  for (let i = 3; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const key = token.slice(2);
    if (!key) throw new AwsCliParseError("Invalid empty option name.");
    const next = tokens[i + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = true;
    }
  }

  return { service, operation, options, positionals };
}

export function optionString(command: ParsedAwsCommand, name: string, required = false) {
  const value = command.options[name];
  if (required && (typeof value !== "string" || !value)) throw new AwsCliParseError(`Missing required option --${name}.`);
  return typeof value === "string" ? value : undefined;
}

export function optionNumber(command: ParsedAwsCommand, name: string, required = false) {
  const raw = optionString(command, name, required);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new AwsCliParseError(`Option --${name} must be numeric.`);
  return value;
}

export function optionBoolean(command: ParsedAwsCommand, name: string) {
  const value = command.options[name];
  if (value === true) return true;
  if (typeof value !== "string") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new AwsCliParseError(`Option --${name} must be true or false.`);
}
