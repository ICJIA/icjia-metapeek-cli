/**
 * HTTP client for the MetaPeek /api/analyze endpoint.
 */

import type { AnalyzeResponse } from "./types.js";

const DEFAULT_API_URL = "https://metapeek.icjia.app/api/analyze";

export class MetaPeekError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "MetaPeekError";
  }
}

export interface AnalyzeOptions {
  apiUrl?: string;
  apiKey?: string;
  signal?: AbortSignal;
}

export async function analyze(
  url: string,
  options: AnalyzeOptions = {},
): Promise<AnalyzeResponse> {
  const apiUrl = options.apiUrl || DEFAULT_API_URL;
  const endpoint = `${apiUrl}?url=${encodeURIComponent(url)}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.apiKey) {
    headers["Authorization"] = `Bearer ${options.apiKey}`;
  }

  let res: Response;
  try {
    res = await fetch(endpoint, { headers, signal: options.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new MetaPeekError("Request timed out");
    }
    throw new MetaPeekError(
      `Network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    let msg = `API returned ${res.status}`;
    try {
      const body = await res.json();
      if (body.message) msg = body.message;
    } catch {
      // ignore parse failures
    }
    throw new MetaPeekError(msg, res.status);
  }

  const data = await res.json();
  return data as AnalyzeResponse;
}
