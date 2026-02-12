import type { AnalyzeResponse } from "../types.js";

export function formatJson(data: AnalyzeResponse): string {
  return JSON.stringify(data, null, 2);
}
