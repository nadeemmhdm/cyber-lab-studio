# KQL Engine

CyberLab includes a local KQL subset engine for security training. It does not call Azure Data Explorer, Microsoft Sentinel, or Defender XDR services.

## Pipeline

Queries follow this execution path:

1. split the query pipeline while respecting quotes and parentheses
2. tokenize expressions
3. parse expressions into an AST with precedence
4. parse pipeline operators into a query AST
5. evaluate expressions with runtime type checks
6. execute operators against stored synthetic tables
7. return rows, columns, row count, execution time, and the AST
8. persist query history for authenticated lab users

## Supported pipeline operators

- `where`
- `project`
- `project-away`
- `extend`
- `sort by`
- `order by`
- `take`
- `limit`
- `summarize`
- `count`
- `distinct`
- `top`

## Expressions

Supported expression features include:

- comparisons: `==`, `!=`, `>`, `>=`, `<`, `<=`
- string operations: `contains`, `startswith`, `endswith`
- boolean logic: `and`, `or`, `not`
- arithmetic: `+`, `-`, `*`, `/`
- parentheses and unary minus
- functions: `datetime()`, `tostring()`, `tolower()`, `toupper()`
- summarize aggregates: `count()`, `sum()`, `avg()`, `min()`, `max()`
- grouping with `summarize ... by ...`

## Error model

The engine returns explicit errors instead of fabricated results:

- `SyntaxError`
- `UnknownTable`
- `UnknownColumn`
- `TypeError`
- `UnsupportedOperator`

## Data model

Phase 7 ships deterministic tables shared by KQL, Sentinel, and Defender XDR:

- `SigninLogs`
- `DeviceProcessEvents`
- `DeviceNetworkEvents`
- `IdentityAuditEvents`
- `SecurityEvent`
- `CloudAuditEvents`
- `UnifiedSecurityEvents`

The tables contain a correlated synthetic attack chain so a learner can pivot across identity, endpoint, network, and cloud activity using the same event IDs.
