import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

const exec = promisify(execFile);
const CLI = resolve(import.meta.dirname, "../dist/cli.js");

describe("CLI integration", () => {
  it("shows help with --help", async () => {
    const { stdout } = await exec("node", [CLI, "--help"]);
    expect(stdout).toContain("metapeek-cli");
    expect(stdout).toContain("URL to analyze");
  });

  it("shows version with --version", async () => {
    const { stdout } = await exec("node", [CLI, "--version"]);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("exits with code 2 for invalid URL", async () => {
    try {
      await exec("node", [CLI, "://invalid"]);
      expect.fail("Should have thrown");
    } catch (err: unknown) {
      const e = err as { code: number; stderr: string };
      expect(e.code).toBe(2);
      expect(e.stderr).toContain("Invalid URL");
    }
  });
});
