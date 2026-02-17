# Inline Analyzer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the external Netlify API with an inline Python analyzer so the CLI is fully self-contained.

**Architecture:** The bash script embeds a Python heredoc that fetches HTML, parses meta tags, runs diagnostics, and returns JSON. The bash script handles arg parsing, formatting, and display as before.

**Tech Stack:** Bash, Python 3 stdlib (html.parser, urllib.request, json), jq

---

### Task 1: Remove --api-url flag and DEFAULT_API_URL

**Files:**
- Modify: `metapeek:6` (remove DEFAULT_API_URL)
- Modify: `metapeek:115` (remove --api-url from help)
- Modify: `metapeek:130` (remove API_URL variable)
- Modify: `metapeek:155-157` (remove --api-url case)

**Step 1: Remove DEFAULT_API_URL constant**

In `metapeek`, delete line 6:
```
DEFAULT_API_URL="https://metapeek.icjia.app/api/analyze"
```

**Step 2: Remove --api-url from help text**

In `metapeek`, remove this line from the `usage()` function (line 115):
```
    --api-url <url>     Override API endpoint
```

And remove the blank line after `--format` that separated the API option.

**Step 3: Remove API_URL variable**

In `metapeek`, delete line 130:
```
API_URL="$DEFAULT_API_URL"
```

**Step 4: Remove --api-url case from arg parser**

In `metapeek`, delete lines 155-157:
```bash
    --api-url)
      [[ $# -lt 2 ]] && { echo "Error: --api-url requires an argument" >&2; exit 2; }
      API_URL="$2"; shift 2 ;;
```

**Step 5: Commit**

```bash
git add metapeek
git commit -m "refactor: remove --api-url flag and external API dependency"
```

---

### Task 2: Add python3 dependency check

**Files:**
- Modify: `metapeek:13-25` (check_deps function)

**Step 1: Add python3 to dep check**

Replace the `check_deps` function with:

```bash
check_deps() {
  local missing=()
  command -v python3 >/dev/null 2>&1 || missing+=(python3)
  command -v jq      >/dev/null 2>&1 || missing+=(jq)
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Error: missing required dependencies: ${missing[*]}" >&2
    echo "" >&2
    echo "Install them:" >&2
    echo "  macOS:       brew install ${missing[*]}" >&2
    echo "  Ubuntu/WSL2: sudo apt install ${missing[*]}" >&2
    exit 2
  fi
}
```

Note: `curl` is no longer required for analysis (only used by the background update checker, which already handles failure gracefully). Remove it from the mandatory check. Keep `python3` and `jq`.

**Step 2: Commit**

```bash
git add metapeek
git commit -m "feat: add python3 dependency check, remove curl requirement"
```

---

### Task 3: Write the inline Python analyzer

**Files:**
- Modify: `metapeek` (add `analyze_url()` function before the API call section)

**Step 1: Add the analyze_url function**

Insert the following function after the `trap stop_spinner EXIT` line (after line 252) and before `check_deps` (line 256). This function contains the full Python analyzer as a heredoc:

```bash
# ── Inline analyzer ─────────────────────────────────────────────────────────
# Pure Python (stdlib only) meta tag analyzer. Fetches HTML, parses meta tags,
# runs diagnostics, computes score. Outputs JSON to stdout.

analyze_url() {
  local url="$1"
  python3 - "$url" "$VERSION" <<'PYTHON_ANALYZER'
import sys
import json
import time
from html.parser import HTMLParser
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

class MetaTagParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = None
        self.description = None
        self.robots = None
        self.canonical = None
        self.og = {}
        self.twitter = {}
        self._in_title = False
        self._title_parts = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self._in_title = True
            self._title_parts = []
        elif tag == "meta":
            name = (a.get("name") or "").lower()
            prop = (a.get("property") or "").lower()
            content = a.get("content", "")
            if name == "description":
                self.description = content
            elif name == "robots":
                self.robots = content
            elif name.startswith("twitter:"):
                self.twitter[name[8:]] = content
            elif prop.startswith("og:"):
                self.og[prop[3:]] = content
        elif tag == "link":
            rel = (a.get("rel") or "").lower()
            href = a.get("href", "")
            if rel == "canonical" and href:
                self.canonical = href

    def handle_data(self, data):
        if self._in_title:
            self._title_parts.append(data)

    def handle_endtag(self, tag):
        if tag == "title" and self._in_title:
            self._in_title = False
            self.title = "".join(self._title_parts).strip() or None

def check_title(title):
    if not title:
        return ("red", "fail", "Title tag missing",
                "Add a <title> tag with a descriptive page title")
    if len(title) > 60:
        return ("yellow", "warning",
                f"Title exceeds 60 characters ({len(title)})",
                "Google may truncate titles longer than 60 characters in search results")
    return ("green", "pass", "Title tag present and optimal length", None)

def check_description(desc):
    if not desc:
        return ("red", "fail", "Meta description missing",
                'Add <meta name="description" content="...">')
    if len(desc) > 160:
        return ("yellow", "warning",
                f"Description exceeds 160 characters ({len(desc)})",
                "Google may truncate descriptions longer than 160 characters")
    if len(desc) < 50:
        return ("yellow", "warning", "Description is very short",
                "Consider adding more detail (aim for 120-160 characters)")
    return ("green", "pass", "Meta description present and optimal length", None)

def check_og(og):
    missing = []
    if not og.get("title"):
        missing.append("og:title")
    if not og.get("description"):
        missing.append("og:description")
    if not og.get("image"):
        missing.append("og:image")
    if len(missing) >= 2:
        return ("red", "fail", f"Missing: {', '.join(missing)}",
                "Add all three core Open Graph tags for social media sharing")
    if len(missing) == 1:
        return ("yellow", "warning", f"Missing: {', '.join(missing)}",
                "Add all three core Open Graph tags for optimal social sharing")
    return ("green", "pass", "All required Open Graph tags present", None)

def check_og_image(og):
    image = og.get("image")
    if not image:
        return ("red", "fail", "og:image missing",
                "Add og:image — this is critical for social media previews")
    if not image.startswith("http://") and not image.startswith("https://"):
        return ("yellow", "warning", "og:image is a relative path",
                "Use an absolute URL (https://...) for og:image")
    return ("green", "pass", "og:image present with absolute URL", None)

def check_twitter(twitter, og):
    has_og = og.get("title") or og.get("description") or og.get("image")
    if not twitter.get("card") and has_og:
        return ("red", "fail", "Twitter Card missing",
                'Add <meta name="twitter:card" content="summary_large_image"> for X/Twitter previews')
    if twitter.get("card"):
        return ("green", "pass", "Twitter Card configured", None)
    return ("green", "pass",
            "Twitter Card tags optional (will fall back to Open Graph)", None)

def check_canonical(canonical, og_url):
    if not canonical:
        return ("red", "fail", "Canonical URL missing",
                'Add <link rel="canonical" href="..."> to prevent duplicate content issues')
    if og_url:
        c_norm = canonical.rstrip("/")
        o_norm = og_url.rstrip("/")
        if c_norm == o_norm and canonical != og_url:
            c_slash = canonical.endswith("/")
            o_slash = og_url.endswith("/")
            return ("yellow", "warning",
                    "Trailing slash inconsistency with og:url",
                    f"Canonical {'has' if c_slash else 'lacks'} trailing slash but og:url {'has' if o_slash else 'lacks'} it. WHY THIS MATTERS FOR SEO: Search engines treat URLs with and without trailing slashes as technically different pages. This inconsistency can split your ranking signals between two versions of the same content. Fix: Choose one format and use it consistently across canonical, og:url, and all meta tags.")
    return ("green", "pass", "Canonical URL present", None)

def check_robots(robots):
    if not robots:
        return ("green", "pass",
                "No robots restrictions (page will be indexed)", None)
    if "noindex" in robots.lower():
        return ("yellow", "warning", "Page is set to noindex",
                "This page will not appear in search results. Remove noindex if this is unintentional.")
    return ("green", "pass", "Robots meta tag present", None)

def compute_score(checks):
    weights = {
        "title": 15, "description": 15, "openGraph": 25,
        "ogImage": 20, "twitterCard": 10, "canonical": 10, "robots": 5
    }
    score_map = {"green": 100, "yellow": 60, "red": 0}
    status_map = {"green": "pass", "yellow": "warning", "red": "fail"}

    categories = {}
    for key, (color, status, message, suggestion) in checks.items():
        s = score_map[color]
        categories[key] = {
            "score": s,
            "status": status_map[color],
            "issues": [message] if status_map[color] != "pass" else []
        }

    overall = round(sum(
        categories[k]["score"] * weights[k] for k in weights
    ) / 100)

    total_issues = sum(len(c["issues"]) for c in categories.values())

    if overall >= 90: grade = "A"
    elif overall >= 80: grade = "B"
    elif overall >= 70: grade = "C"
    elif overall >= 60: grade = "D"
    else: grade = "F"

    return overall, grade, total_issues, categories

def main():
    url = sys.argv[1]
    version = sys.argv[2] if len(sys.argv) > 2 else "0.0.0"
    start = time.time()

    try:
        req = Request(url, headers={
            "User-Agent": f"MetaPeek-CLI/{version}",
        })
        with urlopen(req, timeout=10) as resp:
            html = resp.read(1_048_576).decode("utf-8", errors="replace")
    except HTTPError as e:
        print(json.dumps({"ok": False, "message": f"HTTP {e.code}: {e.reason}"}))
        sys.exit(0)
    except URLError as e:
        reason = str(e.reason) if hasattr(e, "reason") else str(e)
        if "Name or service not known" in reason or "nodename nor servname" in reason:
            msg = "Could not resolve hostname. Check that the domain exists and is spelled correctly."
        elif "Connection refused" in reason:
            msg = "Connection refused by target server. The site may be down or blocking requests."
        elif "timed out" in reason:
            msg = "Request timed out after 10 seconds. The target site did not respond in time."
        else:
            msg = f"Failed to fetch URL: {reason}"
        print(json.dumps({"ok": False, "message": msg}))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"ok": False, "message": f"Failed to fetch URL: {e}"}))
        sys.exit(0)

    elapsed = round((time.time() - start) * 1000)

    parser = MetaTagParser()
    try:
        parser.feed(html)
    except Exception:
        pass  # Best-effort parsing

    checks = {
        "title": check_title(parser.title),
        "description": check_description(parser.description),
        "openGraph": check_og(parser.og),
        "ogImage": check_og_image(parser.og),
        "twitterCard": check_twitter(parser.twitter, parser.og),
        "canonical": check_canonical(parser.canonical, parser.og.get("url")),
        "robots": check_robots(parser.robots),
    }

    overall, grade, total_issues, categories = compute_score(checks)

    diagnostics = {}
    diag_key_map = {
        "title": "title", "description": "description",
        "openGraph": "ogTags", "ogImage": "ogImage",
        "twitterCard": "twitterCard", "canonical": "canonical",
        "robots": "robots"
    }
    for key, (color, status, message, suggestion) in checks.items():
        diagnostics[diag_key_map[key]] = {
            "message": message,
            "suggestion": suggestion
        }

    result = {
        "ok": True,
        "url": url,
        "timing": elapsed,
        "score": {
            "overall": overall,
            "grade": grade,
            "totalIssues": total_issues,
            "categories": categories,
        },
        "diagnostics": diagnostics,
    }

    print(json.dumps(result))

if __name__ == "__main__":
    main()
PYTHON_ANALYZER
}
```

**Step 2: Verify syntax**

```bash
bash -n metapeek
```
Expected: no output (clean syntax).

**Step 3: Commit**

```bash
git add metapeek
git commit -m "feat: add inline Python meta tag analyzer"
```

---

### Task 4: Replace the curl API call with the Python analyzer

**Files:**
- Modify: `metapeek:254-283` (replace the API call section)

**Step 1: Replace the API call block**

Replace everything from `# ── API call` through the HTTP status check (lines 254-283) with:

```bash
# ── Analysis ────────────────────────────────────────────────────────────────

check_deps
start_spinner

RESPONSE=$(analyze_url "$URL") || {
  stop_spinner
  echo "Error: analyzer failed unexpectedly" >&2
  exit 2
}

stop_spinner

# Check for analyzer errors
IS_OK=$(echo "$RESPONSE" | jq -r '.ok' 2>/dev/null)
if [[ "$IS_OK" != "true" ]]; then
  MSG=$(echo "$RESPONSE" | jq -r '.message // empty' 2>/dev/null | sanitize)
  if [[ -n "$MSG" ]]; then
    echo "Error: $MSG" >&2
  else
    echo "Error: analysis failed" >&2
  fi
  exit 2
fi
```

**Step 2: Remove the ENCODED_URL/ENDPOINT/CURL_ARGS variables**

These are no longer needed (they were part of the deleted block).

**Step 3: Test basic functionality**

```bash
./metapeek --no-spinner https://r3.illinois.gov
```
Expected: terminal output with score, categories, timing.

```bash
./metapeek --no-spinner https://github.com
```
Expected: terminal output with issues.

**Step 4: Test JSON mode**

```bash
./metapeek --no-spinner --json https://github.com | jq .score.grade
```
Expected: `"B"` (or similar letter grade).

**Step 5: Test error handling**

```bash
./metapeek --no-spinner https://thisdomaindoesnotexist12345.com
```
Expected: error message about hostname resolution.

**Step 6: Commit**

```bash
git add metapeek
git commit -m "feat: replace external API call with inline analyzer"
```

---

### Task 5: Update tests

**Files:**
- Modify: `test/run.sh`

**Step 1: Remove --api-url tests**

Remove these test lines from the "Flags & argument parsing" section:
```bash
assert_stdout_contains "--help shows --api-url option" "\-\-api-url" "$METAPEEK" --help
```

Remove from "Error handling" section:
```bash
assert_exit "--api-url without value exits 2" 2 "$METAPEEK" --api-url
assert_exit "bad API URL exits 2" 2 "$METAPEEK" --no-spinner --api-url "http://localhost:1" "https://github.com"
```

**Step 2: Add python3 dependency note**

No code change needed — python3 is assumed present on test machines.

**Step 3: Update test counts in README if needed**

The total test count will decrease by 3 (removing --api-url related tests). Update the README test count references.

**Step 4: Run the test suite**

```bash
./test/run.sh
```
Expected: all tests pass (or note which ones need JSON structure adjustments).

**Step 5: Fix any tests that fail due to JSON structure changes**

The JSON structure is designed to be compatible with the existing formatters, so most tests should pass. If any fail, adjust the test expectations.

**Step 6: Commit**

```bash
git add test/run.sh README.md
git commit -m "test: update tests for inline analyzer, remove --api-url tests"
```

---

### Task 6: Update README and help text

**Files:**
- Modify: `README.md`

**Step 1: Update Requirements section**

Change from:
```
`curl` and `jq` must be installed.
```
To:
```
`python3` and `jq` must be installed.
```

Update the install commands:
```bash
# macOS (jq only — python3 is pre-installed)
brew install jq

# Ubuntu / WSL2
sudo apt install python3 jq
```

**Step 2: Remove --api-url from Usage section**

Remove this line from the Usage block:
```
  --api-url <url>     Override API endpoint
```

**Step 3: Update the "Web app" references**

Keep the web app link but clarify the CLI is self-contained:
```
This is the command-line interface for [metapeek](https://metapeek.icjia.app) — the web-based meta tag analyzer. The CLI is fully self-contained and does not require a network API — it fetches and analyzes pages directly.
```

**Step 4: Update test count**

Update "56 tests" to the new count (53 tests after removing 3 --api-url tests).

**Step 5: Commit**

```bash
git add README.md metapeek
git commit -m "docs: update README and help for self-contained analyzer"
```

---

### Task 7: Bump version

**Files:**
- Modify: `metapeek:4` (VERSION)

**Step 1: Bump version to 2.0.0**

This is a breaking change (removed --api-url flag, added python3 dependency, removed curl requirement). Bump to 2.0.0.

```bash
VERSION="2.0.0"
```

**Step 2: Run full test suite**

```bash
./test/run.sh
```
Expected: all tests pass.

**Step 3: Commit and tag**

```bash
git add metapeek
git commit -m "chore: bump version to 2.0.0"
git tag v2.0.0
```
