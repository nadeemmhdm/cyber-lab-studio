export type KqlScalar = string | number | boolean | null;
export type KqlRow = Record<string, KqlScalar>;
export type KqlTables = Record<string, KqlRow[]>;

export type KqlExpression =
  | { kind: "literal"; value: KqlScalar }
  | { kind: "column"; name: string }
  | { kind: "unary"; op: "not" | "-"; expression: KqlExpression }
  | { kind: "binary"; op: "or" | "and" | "==" | "!=" | ">" | ">=" | "<" | "<=" | "contains" | "startswith" | "endswith" | "+" | "-" | "*" | "/"; left: KqlExpression; right: KqlExpression }
  | { kind: "call"; name: "datetime" | "tostring" | "tolower" | "toupper"; args: KqlExpression[] };

export type KqlProjection = { name: string; expression: KqlExpression };
export type KqlAggregate = { name: string; fn: "count" | "sum" | "avg" | "min" | "max"; expression?: KqlExpression };

export type KqlOperator =
  | { kind: "where"; expression: KqlExpression }
  | { kind: "project"; items: KqlProjection[] }
  | { kind: "project-away"; columns: string[] }
  | { kind: "extend"; items: KqlProjection[] }
  | { kind: "sort"; items: { expression: KqlExpression; direction: "asc" | "desc" }[] }
  | { kind: "take"; count: number }
  | { kind: "summarize"; aggregates: KqlAggregate[]; by: KqlProjection[] }
  | { kind: "count" }
  | { kind: "distinct"; items: KqlProjection[] }
  | { kind: "top"; count: number; expression: KqlExpression; direction: "asc" | "desc" };

export type KqlQueryAst = { table: string; operators: KqlOperator[] };
export type KqlResult = { rows: KqlRow[]; columns: string[]; rowCount: number; executionMs: number; ast: KqlQueryAst };
