import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyze, MetaPeekError } from "../src/api.js";

const mockResponse = {
  ok: true,
  url: "https://example.com",
  finalUrl: "https://example.com",
  analyzedAt: "2025-01-01T00:00:00.000Z",
  timing: 500,
  meta: {},
  diagnostics: {
    overall: { status: "red", icon: "error", message: "Issues found" },
    title: { status: "green", icon: "check", message: "Title found" },
    description: {
      status: "green",
      icon: "check",
      message: "Description found",
    },
    ogTags: { status: "red", icon: "error", message: "Missing OG tags" },
    ogImage: { status: "red", icon: "error", message: "Missing OG image" },
    twitterCard: {
      status: "red",
      icon: "error",
      message: "Missing Twitter card",
    },
    canonical: { status: "red", icon: "error", message: "Missing canonical" },
    robots: { status: "green", icon: "check", message: "No restrictions" },
  },
  score: {
    overall: 30,
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
        score: 0,
        maxScore: 100,
        status: "fail",
        weight: 25,
        issues: ["Missing OG tags"],
      },
      ogImage: {
        name: "OG Image",
        score: 0,
        maxScore: 100,
        status: "fail",
        weight: 20,
        issues: ["Missing OG image"],
      },
      twitterCard: {
        name: "Twitter Card",
        score: 0,
        maxScore: 100,
        status: "fail",
        weight: 10,
        issues: ["Missing Twitter card"],
      },
      canonical: {
        name: "Canonical",
        score: 0,
        maxScore: 100,
        status: "fail",
        weight: 10,
        issues: ["Missing canonical"],
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
    totalIssues: 4,
    grade: "F",
  },
};

describe("analyze", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns parsed response on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await analyze("https://example.com");
    expect(result.ok).toBe(true);
    expect(result.score.grade).toBe("F");
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("sends authorization header when apiKey provided", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await analyze("https://example.com", { apiKey: "test-key" });
    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(callArgs[1].headers.Authorization).toBe("Bearer test-key");
  });

  it("uses custom apiUrl when provided", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await analyze("https://example.com", {
      apiUrl: "https://custom.api/analyze",
    });
    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(callArgs[0]).toContain("https://custom.api/analyze");
  });

  it("throws MetaPeekError on HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "Missing url parameter" }),
    });

    await expect(analyze("https://example.com")).rejects.toThrow(MetaPeekError);
  });

  it("throws MetaPeekError on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("fetch failed"));

    await expect(analyze("https://example.com")).rejects.toThrow(MetaPeekError);
    await expect(analyze("https://example.com")).rejects.toThrow(
      /Network error/,
    );
  });
});
