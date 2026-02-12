import type { AnalyzeResponse } from "../types.js";

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

function statusEmoji(status: "pass" | "warning" | "fail"): string {
  if (status === "pass") return "\u2705";
  if (status === "warning") return "\u26A0\uFE0F";
  return "\u274C";
}

export function formatMarkdown(data: AnalyzeResponse): string {
  const { score, diagnostics } = data;
  const lines: string[] = [];

  lines.push(`# MetaPeek \u2014 ${data.url}`);
  lines.push("");
  lines.push(`**Score:** ${score.overall}/100 (**${score.grade}**)`);
  lines.push("");

  // Table
  lines.push("| Status | Category | Score | Details |");
  lines.push("|--------|----------|------:|---------|");

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
    const emoji = statusEmoji(cat.status);
    lines.push(`| ${emoji} | ${label} | ${cat.score} | ${diagMap[key]} |`);
  }

  lines.push("");
  lines.push(`**Issues:** ${score.totalIssues}`);
  lines.push("");
  lines.push(`*Analyzed in ${data.timing}ms*`);
  lines.push("");

  return lines.join("\n");
}
