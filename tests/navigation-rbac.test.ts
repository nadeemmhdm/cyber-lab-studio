import { describe, expect, it } from "vitest";
import type { RoleType } from "@prisma/client";
import { getRoleNavigation } from "@/components/site-navigation";

function hrefs(roles: RoleType[] = [], signedIn = true) {
  return getRoleNavigation(signedIn, roles).map((item) => item.href);
}

describe("role-aware navigation", () => {
  it("shows only public navigation before sign-in", () => {
    expect(hrefs([], false)).toEqual(["/labs", "/login", "/register"]);
  });

  it("shows student learning links without privileged links", () => {
    const items = hrefs(["STUDENT" as RoleType]);
    expect(items).toContain("/progress");
    expect(items).toContain("/achievements");
    expect(items).toContain("/history");
    expect(items).toContain("/doubts");
    expect(items).not.toContain("/instructor");
    expect(items).not.toContain("/admin");
    expect(items).not.toContain("/system-health");
  });

  it("shows instructor tools but not student-only or admin-only links", () => {
    const items = hrefs(["INSTRUCTOR" as RoleType]);
    expect(items).toContain("/instructor");
    expect(items).not.toContain("/progress");
    expect(items).not.toContain("/admin");
    expect(items).not.toContain("/system-health");
  });

  it("shows admin and instructor management without student-only links", () => {
    const items = hrefs(["ADMIN" as RoleType]);
    expect(items).toContain("/instructor");
    expect(items).toContain("/admin");
    expect(items).toContain("/system-health");
    expect(items).not.toContain("/progress");
  });
});
