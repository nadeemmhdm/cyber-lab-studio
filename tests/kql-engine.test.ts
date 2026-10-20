import { describe, expect, it } from "vitest";
import { executeKql, KqlError, KQL_SUPPORTED_OPERATORS, parseKql } from "@/lib/kql/engine";
import type { KqlTables } from "@/lib/kql/types";

const tables: KqlTables = {
  Events: [
    { TimeGenerated: "2026-01-01T10:00:00.000Z", User: "alice", Device: "WEB-01", Action: "LoginFailure", Score: 10, Bytes: 100, Active: true },
    { TimeGenerated: "2026-01-01T10:05:00.000Z", User: "alice", Device: "WEB-01", Action: "LoginSuccess", Score: 80, Bytes: 250, Active: true },
    { TimeGenerated: "2026-01-01T10:10:00.000Z", User: "bob", Device: "DB-01", Action: "PowerShellEncoded", Score: 95, Bytes: 400, Active: false },
    { TimeGenerated: "2026-01-01T10:15:00.000Z", User: "carol", Device: "APP-01", Action: "NetworkConnect", Score: 45, Bytes: 150, Active: true },
  ],
};

describe("KQL parser and evaluator", () => {
  it("builds a query AST", () => {
    const ast = parseKql('Events | where Score >= 50 and Action contains "login" | project User, Score | sort by Score desc | take 5');
    expect(ast.table).toBe("Events");
    expect(ast.operators.map((op) => op.kind)).toEqual(["where", "project", "sort", "take"]);
  });

  it("filters with comparisons, contains, startswith, endswith, and boolean logic", () => {
    expect(executeKql(tables, 'Events | where (Action contains "login" and User startswith "ali") or Device endswith "DB-01" | project User, Action').rows).toEqual([
      { User: "alice", Action: "LoginFailure" },
      { User: "alice", Action: "LoginSuccess" },
      { User: "bob", Action: "PowerShellEncoded" },
    ]);
  });

  it("supports numeric arithmetic, extend, and project aliases", () => {
    const result = executeKql(tables, "Events | where Score > 40 | extend Weighted = Score * 2 + Bytes / 10 | project Account=User, Weighted | sort by Weighted desc");
    expect(result.rows[0]).toEqual({ Account: "bob", Weighted: 230 });
    expect(result.rows).toHaveLength(3);
  });

  it("supports datetime comparisons", () => {
    const result = executeKql(tables, 'Events | where TimeGenerated >= datetime("2026-01-01T10:10:00Z") | project User, TimeGenerated');
    expect(result.rows.map((row) => row.User)).toEqual(["bob", "carol"]);
  });

  it("supports project-away and case conversion functions", () => {
    const result = executeKql(tables, "Events | take 1 | extend Lower=tolower(User), Upper=toupper(Device) | project-away Bytes, Active, Score, Action, TimeGenerated, User, Device");
    expect(result.rows).toEqual([{ Lower: "alice", Upper: "WEB-01" }]);
  });

  it("supports sort/order, take, and limit", () => {
    expect(executeKql(tables, "Events | order by Score desc | take 2").rows.map((row) => row.Score)).toEqual([95, 80]);
    expect(executeKql(tables, "Events | sort by Score asc | limit 1").rows[0].Score).toBe(10);
  });

  it("supports distinct and top", () => {
    expect(executeKql(tables, "Events | distinct User | sort by User asc").rows.map((row) => row.User)).toEqual(["alice", "bob", "carol"]);
    expect(executeKql(tables, "Events | top 2 by Bytes desc | project User, Bytes").rows).toEqual([{ User: "bob", Bytes: 400 }, { User: "alice", Bytes: 250 }]);
  });

  it("supports summarize grouping and count/sum/avg/min/max aggregates", () => {
    const result = executeKql(tables, "Events | summarize Total=count(), BytesTotal=sum(Bytes), AvgScore=avg(Score), MinScore=min(Score), MaxScore=max(Score) by User | sort by User asc");
    expect(result.rows[0]).toEqual({ User: "alice", Total: 2, BytesTotal: 350, AvgScore: 45, MinScore: 10, MaxScore: 80 });
    expect(result.rows[1]).toMatchObject({ User: "bob", Total: 1, BytesTotal: 400 });
  });

  it("supports count as a pipeline operator", () => {
    expect(executeKql(tables, "Events | where Active == true | count").rows).toEqual([{ Count: 3 }]);
  });

  it("returns clear table, column, type, and unsupported operator errors", () => {
    expect(() => executeKql(tables, "Missing | take 1")).toThrowError(KqlError);
    try { executeKql(tables, "Events | where Missing == 1"); } catch (error) { expect((error as KqlError).code).toBe("UnknownColumn"); }
    try { executeKql(tables, "Events | extend Bad = User * 2"); } catch (error) { expect((error as KqlError).code).toBe("TypeError"); }
    try { executeKql(tables, "Events | join Other on User"); } catch (error) { expect((error as KqlError).code).toBe("UnsupportedOperator"); }
  });

  it("declares every Phase 7 supported pipeline operator", () => {
    expect(KQL_SUPPORTED_OPERATORS).toEqual(expect.arrayContaining(["where", "project", "project-away", "extend", "sort", "order", "take", "limit", "summarize", "count", "distinct", "top"]));
  });
});
