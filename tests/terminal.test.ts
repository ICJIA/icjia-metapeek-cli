import { describe, it, expect } from "vitest";
import { formatTerminal } from "../src/formatters/terminal.js";
import type { AnalyzeResponse } from "../src/types.js";

const makeResponse = (
  overrides: Partial<AnalyzeResponse> = {},
): AnalyzeResponse => ({
  ok: true,
  url: "https://example.com",
  finalUrl: "https://example.com",
  analyzedAt: "2025-01-01T00:00:00.000Z",
  timing: 1234,
  meta: {},
  diagnostics: {
    overall: { status: "green", icon: "check", message: "All good" },
    title: { status: "green", icon: "check", message: "Title present" },
    description: {
      status: "green",
      icon: "check",
      message: "Description present",
    },
    ogTags: { status: "green", icon: "check", message: "OG tags present" },
    ogImage: { status: "green", icon: "check", message: "OG image found" },
    twitterCard: {
      status: "green",
      icon: "check",
      message: "Twitter card set",
    },
    canonical: {
      status: "green",
      icon: "check",
      message: "Canonical URL set",
    },
    robots: {
      status: "green",
      icon: "check",
      message: "No restrictions",
    },
  },
  score: {
    overall: 100,
    categories: {
      title: {
        name: "Title",
        score: 100,
        maxScore: 100,
        status: "pass",
        weight: 15,
        issues: [],
      },
      description: {
        name: "Description",
        score: 100,
        maxScore: 100,
        status: "pass",
        weight: 15,
        issues: [],
      },
      openGraph: {
        name: "Open Graph",
        score: 100,
        maxScore: 100,
        status: "pass",
        weight: 25,
        issues: [],
      },
      ogImage: {
        name: "OG Image",
        score: 100,
        maxScore: 100,
        status: "pass",
        weight: 20,
        issues: [],
      },
      twitterCard: {
        name: "Twitter Card",
        score: 100,
        maxScore: 100,
        status: "pass",
        weight: 10,
        issues: [],
      },
      canonical: {
        name: "Canonical",
        score: 100,
        maxScore: 100,
        status: "pass",
        weight: 10,
        issues: [],
      },
      robots: {
        name: "Robots",
        score: 100,
        maxScore: 100,
        status: "pass",
        weight: 5,
        issues: [],
      },
    },
    totalIssues: 0,
    grade: "A",
  },
  ...overrides,
});

describe("formatTerminal", () => {
  it("includes the URL in header", () => {
    const output = formatTerminal(makeResponse());
    expect(output).toContain("https://example.com");
  });

  it("includes score and grade", () => {
    const output = formatTerminal(makeResponse());
    expect(output).toContain("100/100");
  });

  it("includes all category labels", () => {
    const output = formatTerminal(makeResponse());
    expect(output).toContain("Title");
    expect(output).toContain("Description");
    expect(output).toContain("Open Graph");
    expect(output).toContain("OG Image");
    expect(output).toContain("Twitter Card");
    expect(output).toContain("Canonical");
    expect(output).toContain("Robots");
  });

  it("includes timing", () => {
    const output = formatTerminal(makeResponse());
    expect(output).toContain("1234ms");
  });

  it("shows 0 issues for perfect score", () => {
    const output = formatTerminal(makeResponse());
    expect(output).toContain("0 issues found");
  });
});
