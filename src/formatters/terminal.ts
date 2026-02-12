import pc from "picocolors";
import type { AnalyzeResponse, ScoreCategory } from "../types.js";
import { truncate } from "../utils.js";

type CategoryKey = keyof AnalyzeResponse["score"]["categories"];

const CATEGORY_ORDER: { key: CategoryKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "openGraph", label: "Open Graph" },
  { key: "ogImage", label: "OG Image" },
  { key: "twitterCard", label: "Twitter Card" },
  { key: "canonical", label: "Canonical" },
  { key: "robots", label: "Robots" },
];

function colorGrade(grade: string): string {
  if (grade === "A" || grade === "B") return pc.green(grade);
  if (grade === "C") return pc.yellow(grade);
  return pc.red(grade);
}

function colorScore(score: number): string {
  if (score === 100) return pc.green(String(score));
  if (score >= 60) return pc.yellow(String(score));
  return pc.red(String(score));
}

function statusIcon(cat: ScoreCategory): string {
  if (cat.status === "pass") return pc.green("\u2713");
  if (cat.status === "warning") return pc.yellow("\u26A0");
  return pc.red("\u2717");
}

export function formatTerminal(data: AnalyzeResponse): string {
  const { score, diagnostics } = data;
  const lines: string[] = [];

  // Header
  lines.push(`${pc.bold("MetaPeek")} \u2014 ${pc.cyan(data.url)}`);
  lines.push("");

  // Score line
  lines.push(
    `  Score: ${pc.bold(String(score.overall))}/100 (${colorGrade(score.grade)})`,
  );
  lines.push("");

  // Category rows
  const diagMap: Record<CategoryKey, string> = {
    title: diagnostics.title.message,
    description: diagnostics.description.message,
    openGraph: diagnostics.ogTags.message,
    ogImage: diagnostics.ogImage.message,
    twitterCard: diagnostics.twitterCard.message,
    canonical: diagnostics.canonical.message,
    robots: diagnostics.robots.message,
  };

  for (const { key, label } of CATEGORY_ORDER) {
    const cat = score.categories[key];
    const icon = statusIcon(cat);
    const padLabel = label.padEnd(14);
    const padScore = colorScore(cat.score);
    const msg = truncate(diagMap[key], 50);
    lines.push(`  ${icon} ${padLabel} ${padScore}  ${pc.dim(msg)}`);
  }

  lines.push("");

  // Issues count
  const issueCount = score.totalIssues;
  const issueText =
    issueCount === 0
      ? pc.green(`${issueCount} issues found`)
      : pc.yellow(`${issueCount} issue${issueCount === 1 ? "" : "s"} found`);
  lines.push(`  ${issueText}`);
  lines.push("");

  // Timing
  lines.push(`  ${pc.dim(`Analyzed in ${data.timing}ms`)}`);
  lines.push("");

  return lines.join("\n");
}
