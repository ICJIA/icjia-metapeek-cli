# Inline Analyzer Design

**Date:** 2026-02-17
**Status:** Approved

## Goal

Replace the external Netlify API dependency (`https://metapeek.icjia.app/api/analyze`) with an inline Python analyzer embedded in the bash script. After this change, the CLI is fully self-contained — no external API calls for analysis.

## Architecture

```
metapeek (bash)
  ├── arg parsing, URL validation (unchanged)
  ├── inline Python analyzer (new)
  │     ├── urllib.request → fetch HTML
  │     ├── html.parser → extract meta tags
  │     ├── diagnostics → 7 checks (green/yellow/red)
  │     └── scoring → weighted 0-100, letter grade
  ├── JSON output from Python → piped to bash
  └── formatters: terminal, markdown, json (unchanged)
```

## Decisions

- **Approach:** Inline Python heredoc embedded in the bash script (single-file distribution)
- **Dependencies:** python3 (stdlib only — no pip), curl (kept for update check), jq (kept for JSON formatting)
- **`--api-url` flag:** Removed entirely
- **JSON structure:** Simplified but compatible with existing formatter expectations
- **Compatibility:** Same output format for terminal/markdown. JSON shape may differ slightly.

## Python Analyzer Spec

### Input
URL passed as command-line argument to the Python heredoc.

### Fetching
- `urllib.request.urlopen()` with 10-second timeout
- Custom User-Agent: `MetaPeek-CLI/<version>`
- Read up to 1MB of response
- Follow redirects (urllib default behavior)

### Meta Tag Extraction
Using `html.parser.HTMLParser` to extract:
- `<title>` text content
- `<meta name="description" content="...">`
- `<meta name="robots" content="...">`
- `<meta property="og:title" content="...">`
- `<meta property="og:description" content="...">`
- `<meta property="og:image" content="...">`
- `<meta property="og:url" content="...">`
- `<meta name="twitter:card" content="...">`
- `<link rel="canonical" href="...">`

### Diagnostics (7 checks)
Each check produces status (green/yellow/red), message, and optional suggestion:

1. **Title**: missing=red, >60 chars=yellow, else green
2. **Description**: missing=red, >160 chars=yellow, <50 chars=yellow, else green
3. **OG Tags**: missing 2+ of (title/desc/image)=red, missing 1=yellow, else green
4. **OG Image**: missing=red, relative URL=yellow, else green
5. **Twitter Card**: no card but has OG=red, has card=green, no OG either=green
6. **Canonical**: missing=red, trailing slash mismatch with og:url=yellow, else green
7. **Robots**: contains noindex=yellow, else green

### Scoring
- green=100, yellow=60, red=0 per category
- Weights: title 15%, description 15%, OG 25%, OG image 20%, Twitter 10%, canonical 10%, robots 5%
- Grade: A>=90, B>=80, C>=70, D>=60, F<60

### Output JSON
```json
{
  "ok": true,
  "url": "https://example.com",
  "timing": 142,
  "score": {
    "overall": 84,
    "grade": "B",
    "totalIssues": 2,
    "categories": {
      "title": { "score": 100, "status": "pass", "issues": [] },
      "description": { "score": 60, "status": "warning", "issues": ["Description exceeds 160 characters (186)"] },
      "openGraph": { "score": 100, "status": "pass", "issues": [] },
      "ogImage": { "score": 100, "status": "pass", "issues": [] },
      "twitterCard": { "score": 100, "status": "pass", "issues": [] },
      "canonical": { "score": 60, "status": "warning", "issues": ["Trailing slash inconsistency with og:url"] },
      "robots": { "score": 100, "status": "pass", "issues": [] }
    }
  },
  "diagnostics": {
    "title": { "message": "Title tag present and optimal length", "suggestion": null },
    "description": { "message": "Description exceeds 160 characters (186)", "suggestion": "Google may truncate descriptions longer than 160 characters" },
    "ogTags": { "message": "All required Open Graph tags present", "suggestion": null },
    "ogImage": { "message": "og:image present with absolute URL", "suggestion": null },
    "twitterCard": { "message": "Twitter Card configured", "suggestion": null },
    "canonical": { "message": "Trailing slash inconsistency with og:url", "suggestion": "Canonical lacks trailing slash but og:url has it..." },
    "robots": { "message": "No robots restrictions (page will be indexed)", "suggestion": null }
  }
}
```

### Error JSON
```json
{"ok": false, "message": "Could not resolve hostname"}
```

## What Changes in the Bash Script

### Removed
- `DEFAULT_API_URL` variable
- `API_URL` variable and `--api-url` flag
- `ENDPOINT` construction
- External `curl` API call block (lines ~259-283)
- `--api-url` from help text

### Added
- `python3` to dependency check
- `analyze_url()` function that invokes inline Python heredoc
- Python heredoc containing the full analyzer (~150-200 lines)

### Unchanged
- Banner, usage, arg parsing (minus --api-url)
- URL normalization and validation
- Sanitize helpers
- Color helpers, spinner
- All formatters (terminal, markdown, JSON)
- Update checker
- Test runner (--tests flag)
- Exit code logic

## Test Impact

- Offline tests: all pass unchanged
- Live API tests: update to match new JSON structure
- Security tests: all pass unchanged (URL validation is still in bash)
- New opportunity: add offline tests with mock HTML
