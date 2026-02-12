import { Command } from "commander";
import { analyze, MetaPeekError } from "./api.js";
import { normalizeUrl, isValidUrl } from "./utils.js";
import { formatTerminal } from "./formatters/terminal.js";
import { formatJson } from "./formatters/json.js";
import { formatMarkdown } from "./formatters/markdown.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const program = new Command();

program
  .name("metapeek-cli")
  .description("Analyze meta tags and social sharing readiness for any URL")
  .version(pkg.version, "-V, --version")
  .argument("<url>", "URL to analyze")
  .option("--json", "Output raw JSON")
  .option(
    "--format <type>",
    "Output format: terminal (default) or markdown",
    "terminal",
  )
  .option(
    "--api-url <url>",
    "Override API endpoint",
    "https://metapeek.icjia.app/api/analyze",
  )
  .option("--api-key <key>", "API key for authenticated endpoints")
  .option("--no-color", "Disable colored output")
  .option("--no-spinner", "Disable loading spinner")
  .action(async (urlArg: string, opts) => {
    const url = normalizeUrl(urlArg);

    if (!isValidUrl(url)) {
      console.error(`Error: Invalid URL "${urlArg}"`);
      process.exit(2);
    }

    // Determine if we should use a spinner
    const isTTY = process.stdout.isTTY ?? false;
    const useSpinner = isTTY && opts.spinner && !opts.json;

    let spinner: { start: () => void; stop: () => void } | null = null;
    if (useSpinner) {
      const ora = (await import("ora")).default;
      spinner = ora({ text: `Analyzing ${url}...`, stream: process.stderr });
      spinner.start();
    }

    try {
      const data = await analyze(url, {
        apiUrl: opts.apiUrl,
        apiKey: opts.apiKey,
      });

      if (spinner) spinner.stop();

      // Format output
      let output: string;
      if (opts.json) {
        output = formatJson(data);
      } else if (opts.format === "markdown") {
        output = formatMarkdown(data);
      } else {
        output = formatTerminal(data);
      }

      process.stdout.write(output + "\n");

      // Exit code based on grade
      const grade = data.score.grade;
      if (grade === "A" || grade === "B") {
        process.exit(0);
      } else {
        process.exit(1);
      }
    } catch (err) {
      if (spinner) spinner.stop();

      if (err instanceof MetaPeekError) {
        console.error(`Error: ${err.message}`);
      } else if (err instanceof Error) {
        console.error(`Error: ${err.message}`);
      } else {
        console.error("An unexpected error occurred.");
      }
      process.exit(2);
    }
  });

program.parse();
