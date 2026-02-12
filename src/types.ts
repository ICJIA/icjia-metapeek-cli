/**
 * TypeScript interfaces mirrored from MetaPeek web app (shared/types.ts).
 * Only includes types needed by the CLI.
 */

export interface DiagnosticResult {
  status: "green" | "yellow" | "red";
  icon: "check" | "warning" | "error";
  message: string;
  suggestion?: string;
}

export interface Diagnostics {
  overall: DiagnosticResult;
  title: DiagnosticResult;
  description: DiagnosticResult;
  ogTags: DiagnosticResult;
  ogImage: DiagnosticResult;
  twitterCard: DiagnosticResult;
  canonical: DiagnosticResult;
  robots: DiagnosticResult;
}

export interface ScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  status: "pass" | "warning" | "fail";
  weight: number;
  issues: string[];
}

export interface MetaScore {
  overall: number;
  categories: {
    title: ScoreCategory;
    description: ScoreCategory;
    openGraph: ScoreCategory;
    ogImage: ScoreCategory;
    twitterCard: ScoreCategory;
    canonical: ScoreCategory;
    robots: ScoreCategory;
  };
  totalIssues: number;
  grade: "A" | "B" | "C" | "D" | "F";
}

/** Shape of the /api/analyze JSON response */
export interface AnalyzeResponse {
  ok: true;
  url: string;
  finalUrl: string;
  analyzedAt: string;
  timing: number;
  meta: Record<string, unknown>;
  diagnostics: Diagnostics;
  score: MetaScore;
}

/** API error response */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
}
