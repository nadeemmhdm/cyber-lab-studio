import { describe, expect, it } from "vitest";
import { LABS } from "@/lib/labs/catalog";
import { generateCompletionFlag } from "@/lib/security/flags";

describe("lab catalogue", () => {
  it("contains exactly 30 uniquely numbered labs", () => {
    expect(LABS).toHaveLength(30);
    expect(new Set(LABS.map((lab) => lab.number)).size).toBe(30);
    expect(LABS.map((lab) => lab.number)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
  });

  it("contains unique slugs and positive durations", () => {
    expect(new Set(LABS.map((lab) => lab.slug)).size).toBe(30);
    expect(LABS.every((lab) => lab.estimatedMinutes > 0)).toBe(true);
  });

  it("keeps the required platform distribution", () => {
    const count = (platform: string) => LABS.filter((lab) => lab.platform === platform).length;
    expect(count("FUNDAMENTALS")).toBe(2);
    expect(count("AWS")).toBe(16);
    expect(count("AZURE")).toBe(4);
    expect(count("SENTINEL")).toBe(2);
    expect(count("KQL")).toBe(2);
    expect(count("DEFENDER_XDR")).toBe(4);
  });
});

describe("completion flags", () => {
  it("uses the CYBERLAB format and secure random material", () => {
    const flag = generateCompletionFlag();
    expect(flag).toMatch(/^CYBERLAB\{[A-Za-z0-9_-]{32}\}$/);
  });

  it("does not repeat across a practical sample", () => {
    const flags = Array.from({ length: 256 }, generateCompletionFlag);
    expect(new Set(flags).size).toBe(flags.length);
  });
});
