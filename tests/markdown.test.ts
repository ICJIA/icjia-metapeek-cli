import { describe, it, expect } from "vitest";
import { formatMarkdown } from "../src/formatters/markdown.js";
import type { AnalyzeResponse } from "../src/types.js";

const makeResponse = (): AnalyzeResponse => ({
  ok: true,
  url: "https://example.com",
  finalUrl: "https://example.com",
  analyzedAt: "2025-01-01T00:00:00.000Z",
  timing: 500,
  meta: {},
  diagnostics: {
    overall: { status: "red", icon: "error", message: "Issues found" },
    title: { status: "green", icon: "check", message: "Title present" },
    description: { status: "red", icon: "error", message: "Missing" },
    ogTags: { status: "red", icon: "error", message: "Missing OG" },
    ogImage: { status: "red", icon: "error", message: "No image" },
    twitterCard: { status: "red", icon: "error", message: "No card" },
    canonical: { status: "yellow", icon: "warning", message: "Partial" },
    robots: { status: "green", icon: "check", message: "OK" },
  },
  score: {
    overall: 20,
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
        score: 0,
        maxScore: 100,
        status: "fail",
        weight: 15,
        issues: ["Missing"],
      },
      openGraph: {
        name: "Open Graph",
        score: 0,
        maxScore: 100,
        status: "fail",
        weight: 25,
        issues: ["Missing OG"],
      },
      ogImage: {
        name: "OG Image",
        score: 0,
        maxScore: 100,
        status: "fail",
        weight: 20,
        issues: ["No image"],
      },
      twitterCard: {
        name: "Twitter Card",
        score: 0,
        maxScore: 100,
        status: "fail",
        weight: 10,
        issues: ["No card"],
      },
      canonical: {
        name: "Canonical",
        score: 60,
        maxScore: 100,
        status: "warning",
        weight: 10,
        issues: ["Partial"],
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
    totalIssues: 5,
    grade: "F",
  },
});

describe("formatMarkdown", () => {
  it("includes markdown heading with URL", () => {
    const output = formatMarkdown(makeResponse());
    expect(output).toContain("# MetaPeek");
    expect(output).toContain("https://example.com");
  });

  it("includes score and grade", () => {
    const output = formatMarkdown(makeResponse());
    expect(output).toContain("20/100");
    expect(output).toContain("**F**");
  });

  it("includes table headers", () => {
    const output = formatMarkdown(makeResponse());
    expect(output).toContain("| Status | Category | Score | Details |");
  });

  it("includes all categories in table", () => {
    const output = formatMarkdown(makeResponse());
    expect(output).toContain("Title");
    expect(output).toContain("Description");
    expect(output).toContain("Open Graph");
    expect(output).toContain("OG Image");
    expect(output).toContain("Twitter Card");
    expect(output).toContain("Canonical");
    expect(output).toContain("Robots");
  });

  it("includes timing", () => {
    const output = formatMarkdown(makeResponse());
    expect(output).toContain("500ms");
  });

  it("uses correct status emojis", () => {
    const output = formatMarkdown(makeResponse());
    expect(output).toContain("\u2705"); // pass
    expect(output).toContain("\u274C"); // fail
    expect(output).toContain("\u26A0\uFE0F"); // warning
  });
});
