import { describe, it, expect } from "vitest";
import { normalizeUrl, truncate, isValidUrl } from "../src/utils.js";

describe("normalizeUrl", () => {
  it("returns https URL unchanged", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("returns http URL unchanged", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("prepends https:// when no protocol", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
  });

  it("trims whitespace", () => {
    expect(normalizeUrl("  https://example.com  ")).toBe(
      "https://example.com",
    );
  });

  it("returns empty string for empty input", () => {
    expect(normalizeUrl("")).toBe("");
  });
});

describe("truncate", () => {
  it("returns short strings unchanged", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates long strings with ellipsis", () => {
    expect(truncate("hello world", 6)).toBe("hello\u2026");
  });

  it("returns string at exact max length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("isValidUrl", () => {
  it("accepts https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("rejects non-http protocols", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isValidUrl("not-a-url")).toBe(false);
  });
});
