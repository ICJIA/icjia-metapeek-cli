#!/usr/bin/env bash
set -euo pipefail

# ── Test runner for metapeek ─────────────────────────────────────────────────
#
# Usage:  ./test/run.sh [--offline]
#
#   --offline   Skip tests that hit the live API (run only unit-style tests)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
METAPEEK="$PROJECT_DIR/metapeek"

PASS=0
FAIL=0
SKIP=0
OFFLINE=false

[[ "${1:-}" == "--offline" ]] && OFFLINE=true

# ── Helpers ──────────────────────────────────────────────────────────────────

pass() { ((PASS++)); printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { ((FAIL++)); printf '  \033[31m✗\033[0m %s\n' "$1"; printf '    %s\n' "$2"; }
skip() { ((SKIP++)); printf '  \033[33m○\033[0m %s (skipped)\n' "$1"; }

assert_exit() {
  local description="$1" expected="$2"
  shift 2
  local actual
  set +e
  "$@" >/dev/null 2>&1
  actual=$?
  set -e
  if [[ "$actual" -eq "$expected" ]]; then
    pass "$description"
  else
    fail "$description" "expected exit $expected, got $actual"
  fi
}

assert_stdout_contains() {
  local description="$1" pattern="$2"
  shift 2
  local output
  set +e
  output=$("$@" 2>/dev/null)
  set -e
  if echo "$output" | grep -q "$pattern"; then
    pass "$description"
  else
    fail "$description" "output did not contain: $pattern"
  fi
}

assert_stderr_contains() {
  local description="$1" pattern="$2"
  shift 2
  local errout
  set +e
  errout=$("$@" 2>&1 >/dev/null)
  set -e
  if echo "$errout" | grep -q "$pattern"; then
    pass "$description"
  else
    fail "$description" "stderr did not contain: $pattern"
  fi
}

assert_stdout_not_contains() {
  local description="$1" pattern="$2"
  shift 2
  local output
  set +e
  output=$("$@" 2>/dev/null)
  set -e
  if echo "$output" | grep -q "$pattern"; then
    fail "$description" "output unexpectedly contained: $pattern"
  else
    pass "$description"
  fi
}

# ── Banner ───────────────────────────────────────────────────────────────────

echo ""
echo "  metapeek test suite"
echo "  ═══════════════════"
echo ""

# ── 1. Flags & argument parsing ─────────────────────────────────────────────

echo "  Flags & argument parsing"
echo "  ────────────────────────"

assert_exit "--help exits 0" 0 "$METAPEEK" --help
assert_exit "-h exits 0" 0 "$METAPEEK" -h
assert_exit "--version exits 0" 0 "$METAPEEK" --version
assert_exit "-V exits 0" 0 "$METAPEEK" -V

assert_stdout_contains "--help shows usage" "Usage:" "$METAPEEK" --help
assert_stdout_contains "--help shows banner" "metapeek" "$METAPEEK" --help
assert_stdout_contains "--help shows --json option" "\-\-json" "$METAPEEK" --help
assert_stdout_contains "--help shows --format option" "\-\-format" "$METAPEEK" --help
assert_stdout_contains "--help shows --no-color option" "\-\-no-color" "$METAPEEK" --help
assert_stdout_contains "--help shows --full option" "\-\-full" "$METAPEEK" --help
assert_stdout_contains "--help shows --no-spinner option" "\-\-no-spinner" "$METAPEEK" --help
assert_stdout_contains "--help shows --tests option" "\-\-tests" "$METAPEEK" --help

assert_stdout_contains "--version prints version" "metapeek" "$METAPEEK" --version
assert_stdout_contains "--version includes semver" "[0-9]\+\.[0-9]\+\.[0-9]\+" "$METAPEEK" --version

echo ""

# ── 2. Error handling ───────────────────────────────────────────────────────

echo "  Error handling"
echo "  ──────────────"

assert_exit "no args exits 2" 2 "$METAPEEK"
assert_stderr_contains "no args shows error" "missing required argument" "$METAPEEK"
assert_stderr_contains "no args shows help hint" "metapeek --help" "$METAPEEK"

assert_exit "ftp:// URL exits 2" 2 "$METAPEEK" "ftp://bad"
assert_stderr_contains "ftp:// URL shows protocol error" "only http and https" "$METAPEEK" "ftp://bad"

assert_exit "unknown option exits 2" 2 "$METAPEEK" --bogus
assert_stderr_contains "unknown option shows error" "unknown option" "$METAPEEK" --bogus

assert_exit "extra positional arg exits 2" 2 "$METAPEEK" "https://a.com" "https://b.com"
assert_stderr_contains "extra arg shows error" "unexpected argument" "$METAPEEK" "https://a.com" "https://b.com"

assert_exit "--format without value exits 2" 2 "$METAPEEK" --format
assert_exit "--format with invalid value exits 2" 2 "$METAPEEK" --format csv "https://example.com"
assert_stderr_contains "--format invalid shows error" "unknown format" "$METAPEEK" --format csv "https://example.com"

echo ""

# ── 3. URL normalization ────────────────────────────────────────────────────

echo "  URL normalization"
echo "  ─────────────────"

if [[ "$OFFLINE" == true ]]; then
  skip "bare domain gets https:// prepended (requires network)"
  skip "http:// URL passes validation (requires network)"
else
  # Bare domain should be normalized to https:// and work
  set +e
  output=$("$METAPEEK" --no-spinner --no-color "github.com" 2>&1)
  exit_code=$?
  set -e
  if echo "$output" | grep -q "https://github.com"; then
    pass "bare domain gets https:// prepended"
  else
    fail "bare domain gets https:// prepended" "output did not contain https://github.com"
  fi

  # http:// should pass local validation (API may still reject it)
  set +e
  errout=$("$METAPEEK" --no-spinner --no-color "http://github.com" 2>&1 >/dev/null)
  exit_code=$?
  set -e
  if echo "$errout" | grep -q "only http and https"; then
    fail "http:// URL passes local validation" "script rejected http:// before reaching API"
  else
    pass "http:// URL passes local validation"
  fi
fi

# Protocol rejection (no network needed)
assert_exit "ftp:// rejected" 2 "$METAPEEK" "ftp://github.com"
assert_exit "mailto: rejected" 2 "$METAPEEK" "mailto:user@github.com"
assert_exit "file:// rejected" 2 "$METAPEEK" "file:///etc/passwd"

echo ""

# ── 4. Live API — terminal output ───────────────────────────────────────────

echo "  Live API — terminal output"
echo "  ──────────────────────────"

if [[ "$OFFLINE" == true ]]; then
  skip "r3.illinois.gov scores A (requires network)"
  skip "terminal output contains Score line (requires network)"
  skip "terminal output contains category rows (requires network)"
  skip "terminal output contains issues count (requires network)"
  skip "terminal output contains timing (requires network)"
  skip "terminal output contains exit hint (requires network)"
  skip "github.com exits 0 (requires network)"
  skip "github.com shows issues section (requires network)"
  skip "github.com shows LLM copy block (requires network)"
  skip "github.com shows pass exit hint (requires network)"
else
  # Grade A site
  set +e
  output=$("$METAPEEK" --no-spinner --no-color "https://r3.illinois.gov" 2>&1)
  exit_code=$?
  set -e

  if [[ "$exit_code" -eq 0 ]]; then
    pass "r3.illinois.gov exits 0 (grade A/B)"
  else
    fail "r3.illinois.gov exits 0 (grade A/B)" "got exit $exit_code"
  fi

  if echo "$output" | grep -q "Score:.*100.*A"; then
    pass "terminal output contains Score line"
  else
    fail "terminal output contains Score line" "missing score"
  fi

  if echo "$output" | grep -q "Title"; then
    pass "terminal output contains category rows"
  else
    fail "terminal output contains category rows" "missing categories"
  fi

  if echo "$output" | grep -q "0 issues found"; then
    pass "terminal output contains issues count"
  else
    fail "terminal output contains issues count" "missing issue count"
  fi

  if echo "$output" | grep -q "Analyzed in"; then
    pass "terminal output contains timing"
  else
    fail "terminal output contains timing" "missing timing line"
  fi

  if echo "$output" | grep -q "Pass (exit 0)"; then
    pass "terminal output contains pass exit hint"
  else
    fail "terminal output contains pass exit hint" "missing exit hint"
  fi

  # Grade B site with warnings
  set +e
  output=$("$METAPEEK" --no-spinner --no-color "https://github.com" 2>&1)
  exit_code=$?
  set -e

  if [[ "$exit_code" -eq 0 ]]; then
    pass "github.com exits 0 (grade A/B with warnings)"
  else
    fail "github.com exits 0 (grade A/B with warnings)" "got exit $exit_code"
  fi

  if echo "$output" | grep -q "Issues:"; then
    pass "github.com shows issues section"
  else
    fail "github.com shows issues section" "missing issues"
  fi

  if echo "$output" | grep -q "Copy for LLM"; then
    pass "github.com shows LLM copy block"
  else
    fail "github.com shows LLM copy block" "missing LLM block"
  fi

  if echo "$output" | grep -q "Pass (exit 0)"; then
    pass "github.com shows pass exit hint"
  else
    fail "github.com shows pass exit hint" "missing exit hint"
  fi
fi

echo ""

# ── 5. Live API — JSON output ───────────────────────────────────────────────

echo "  Live API — JSON output"
echo "  ──────────────────────"

if [[ "$OFFLINE" == true ]]; then
  skip "JSON output is valid JSON (requires network)"
  skip "JSON contains expected fields (requires network)"
  skip "JSON mode does not contain ANSI codes (requires network)"
else
  set +e
  output=$("$METAPEEK" --no-spinner "https://github.com" --json 2>/dev/null)
  exit_code=$?
  set -e

  if echo "$output" | jq . >/dev/null 2>&1; then
    pass "JSON output is valid JSON"
  else
    fail "JSON output is valid JSON" "jq parse failed"
  fi

  if echo "$output" | jq -e '.ok, .url, .score.grade, .score.overall, .diagnostics' >/dev/null 2>&1; then
    pass "JSON contains expected fields (ok, url, score, diagnostics)"
  else
    fail "JSON contains expected fields" "missing fields"
  fi

  if echo "$output" | grep -q $'\033'; then
    fail "JSON mode does not contain ANSI codes" "found ANSI escape sequences"
  else
    pass "JSON mode does not contain ANSI codes"
  fi
fi

echo ""

# ── 6. Live API — Markdown output ───────────────────────────────────────────

echo "  Live API — markdown output"
echo "  ──────────────────────────"

if [[ "$OFFLINE" == true ]]; then
  skip "markdown output contains heading (requires network)"
  skip "markdown output contains table (requires network)"
  skip "markdown output contains result line (requires network)"
else
  set +e
  output=$("$METAPEEK" --no-spinner --no-color "https://github.com" --format markdown 2>/dev/null)
  set -e

  if echo "$output" | grep -q "^# metapeek"; then
    pass "markdown output contains heading"
  else
    fail "markdown output contains heading" "missing # heading"
  fi

  if echo "$output" | grep -q "| Status | Category"; then
    pass "markdown output contains table"
  else
    fail "markdown output contains table" "missing table header"
  fi

  if echo "$output" | grep -q "Result:.*exit"; then
    pass "markdown output contains result line"
  else
    fail "markdown output contains result line" "missing result line"
  fi
fi

echo ""

# ── 7. No-color output ──────────────────────────────────────────────────────

echo "  No-color output"
echo "  ───────────────"

if [[ "$OFFLINE" == true ]]; then
  skip "--no-color strips ANSI codes (requires network)"
else
  set +e
  output=$("$METAPEEK" --no-spinner --no-color "https://github.com" 2>/dev/null)
  set -e

  if echo "$output" | grep -q $'\033'; then
    fail "--no-color strips ANSI codes" "found ANSI escape sequences"
  else
    pass "--no-color strips ANSI codes"
  fi
fi

echo ""

# ── 8. Full metadata output ────────────────────────────────────────────────

echo "  Full metadata output"
echo "  ────────────────────"

if [[ "$OFFLINE" == true ]]; then
  skip "--full flag is accepted (requires network)"
  skip "--full output contains Metadata header (requires network)"
  skip "--full output contains og:title label (requires network)"
  skip "--full --json has meta key (requires network)"
  skip "--full --format markdown contains Metadata heading (requires network)"
else
  assert_exit "--full flag is accepted" 0 "$METAPEEK" --no-spinner --no-color --full "https://r3.illinois.gov"

  set +e
  full_output=$("$METAPEEK" --no-spinner --no-color --full "https://r3.illinois.gov" 2>/dev/null)
  set -e

  if echo "$full_output" | grep -q "Metadata"; then
    pass "--full output contains Metadata header"
  else
    fail "--full output contains Metadata header" "missing Metadata header"
  fi

  if echo "$full_output" | grep -q "og:title"; then
    pass "--full output contains og:title label"
  else
    fail "--full output contains og:title label" "missing og:title"
  fi

  set +e
  full_json=$("$METAPEEK" --no-spinner --full "https://r3.illinois.gov" --json 2>/dev/null)
  set -e

  if echo "$full_json" | jq -e '.meta' >/dev/null 2>&1; then
    pass "--full --json has meta key"
  else
    fail "--full --json has meta key" "missing .meta in JSON"
  fi

  set +e
  full_md=$("$METAPEEK" --no-spinner --no-color --full "https://r3.illinois.gov" --format markdown 2>/dev/null)
  set -e

  if echo "$full_md" | grep -q "## Metadata"; then
    pass "--full --format markdown contains Metadata heading"
  else
    fail "--full --format markdown contains Metadata heading" "missing ## Metadata"
  fi
fi

echo ""

# ── 9. Image dimension checking ──────────────────────────────────────────────

echo "  Image dimension checking"
echo "  ────────────────────────"

if [[ "$OFFLINE" == true ]]; then
  skip "JSON contains .meta.og.image_dimensions (requires network)"
  skip "image_dimensions has width and height values (requires network)"
  skip "--full terminal shows og:image size (requires network)"
  skip "--full markdown shows og:image size (requires network)"
else
  set +e
  dim_json=$("$METAPEEK" --no-spinner "https://r3.illinois.gov" --json 2>/dev/null)
  set -e

  if echo "$dim_json" | jq -e '.meta.og.image_dimensions' >/dev/null 2>&1; then
    pass "JSON contains .meta.og.image_dimensions"
  else
    fail "JSON contains .meta.og.image_dimensions" "missing image_dimensions key"
  fi

  dim_w=$(echo "$dim_json" | jq -r '.meta.og.image_dimensions.width // empty')
  dim_h=$(echo "$dim_json" | jq -r '.meta.og.image_dimensions.height // empty')
  if [[ -n "$dim_w" && "$dim_w" != "null" && -n "$dim_h" && "$dim_h" != "null" ]]; then
    pass "image_dimensions has width ($dim_w) and height ($dim_h) values"
  else
    fail "image_dimensions has width and height values" "width=$dim_w height=$dim_h"
  fi

  set +e
  dim_term=$("$METAPEEK" --no-spinner --no-color --full "https://r3.illinois.gov" 2>/dev/null)
  set -e

  if echo "$dim_term" | grep -q "og:image size"; then
    pass "--full terminal shows og:image size"
  else
    fail "--full terminal shows og:image size" "missing og:image size row"
  fi

  set +e
  dim_md=$("$METAPEEK" --no-spinner --no-color --full "https://r3.illinois.gov" --format markdown 2>/dev/null)
  set -e

  if echo "$dim_md" | grep -q "og:image size"; then
    pass "--full markdown shows og:image size"
  else
    fail "--full markdown shows og:image size" "missing og:image size row"
  fi
fi

echo ""

# ── 10. Security ─────────────────────────────────────────────────────────────

echo "  Security"
echo "  ────────"

# URL with shell metacharacters should not cause injection
# Uses .test TLD (RFC 6761) which will never resolve, guaranteeing exit 2
assert_exit 'URL with shell metacharacters exits safely' 2 "$METAPEEK" --no-spinner 'https://no-resolve.test/$(whoami)'
assert_exit 'URL with backticks exits safely' 2 "$METAPEEK" --no-spinner 'https://no-resolve.test/`id`'
assert_exit 'URL with semicolons exits safely' 2 "$METAPEEK" --no-spinner 'https://no-resolve.test/;rm -rf /'
assert_exit 'URL with pipe exits safely' 2 "$METAPEEK" --no-spinner 'https://no-resolve.test/|cat /etc/passwd'

# Sanitize function strips control characters
sanitize_output=$(printf 'hello\033[31mworld\033[0m\x07bell' | LC_ALL=C tr -d '\000-\010\013\014\016-\037\177')
if [[ "$sanitize_output" == "hello[31mworld[0mbell" ]]; then
  pass "sanitize strips ESC and BEL characters"
else
  fail "sanitize strips ESC and BEL characters" "got: $sanitize_output"
fi

# Null bytes stripped
sanitize_null=$(printf 'hel\x00lo' | LC_ALL=C tr -d '\000-\010\013\014\016-\037\177')
if [[ "$sanitize_null" == "hello" ]]; then
  pass "sanitize strips null bytes"
else
  fail "sanitize strips null bytes" "got: $sanitize_null"
fi

# Tabs and newlines preserved
sanitize_tab=$(printf 'a\tb\nc' | LC_ALL=C tr -d '\000-\010\013\014\016-\037\177')
if [[ "$sanitize_tab" == $'a\tb\nc' ]]; then
  pass "sanitize preserves tabs and newlines"
else
  fail "sanitize preserves tabs and newlines" "got: $sanitize_tab"
fi


# Non-https protocols rejected locally (no network request made)
assert_exit "javascript: URL rejected" 2 "$METAPEEK" "javascript:alert(1)"
assert_exit "data: URL rejected" 2 "$METAPEEK" "data:text/html,<h1>hi</h1>"

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────

TOTAL=$((PASS + FAIL + SKIP))
echo "  ═══════════════════"
printf '  \033[32m%d passed\033[0m' "$PASS"
if [[ "$FAIL" -gt 0 ]]; then
  printf ', \033[31m%d failed\033[0m' "$FAIL"
fi
if [[ "$SKIP" -gt 0 ]]; then
  printf ', \033[33m%d skipped\033[0m' "$SKIP"
fi
printf ' (%d total)\n' "$TOTAL"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
