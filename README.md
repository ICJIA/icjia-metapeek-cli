# metapeek-cli

CLI tool for analyzing meta tags and social sharing readiness.

This is the command-line interface for [metapeek](https://metapeek.icjia.app) — the web-based meta tag analyzer. The CLI is fully self-contained and analyzes pages directly — no external API required. Use it for CI/CD pipelines, scripts, or quick terminal analysis.

**Web app:** https://metapeek.icjia.app

**Web app source:** https://github.com/ICJIA/icjia-metapeek

## Platform Support

metapeek requires a Unix shell (bash). It runs on:

- **macOS**

- **Linux**

- **Windows via WSL2**

> **Windows note:** metapeek does not run in PowerShell or Command Prompt. You must use [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) with a Linux distribution (e.g. Ubuntu) to run on a Windows machine.

## Install

### Option 1: Clone and run directly

```bash
git clone https://github.com/ICJIA/icjia-metapeek-cli.git
cd icjia-metapeek-cli
chmod +x metapeek
./metapeek https://github.com
```

### Option 2: Clone and add to your PATH

```bash
git clone https://github.com/ICJIA/icjia-metapeek-cli.git
ln -s "$(pwd)/icjia-metapeek-cli/metapeek" /usr/local/bin/metapeek
```

### Option 3: Direct download

```bash
curl -fsSL https://raw.githubusercontent.com/ICJIA/icjia-metapeek-cli/main/metapeek -o /usr/local/bin/metapeek && chmod +x /usr/local/bin/metapeek
```

### Permissions

If you get a `Permission denied` error when running `./metapeek`, set the executable bit:

```bash
chmod +x metapeek
```

If `ln -s` or downloading to `/usr/local/bin` fails with a permissions error, use `sudo`:

```bash
sudo ln -s "$(pwd)/icjia-metapeek-cli/metapeek" /usr/local/bin/metapeek
```

Or install to your user-local bin directory instead (no `sudo` needed):

```bash
mkdir -p ~/.local/bin
ln -s "$(pwd)/icjia-metapeek-cli/metapeek" ~/.local/bin/metapeek
```

Make sure `~/.local/bin` is in your `PATH`. Add this to your `~/.zshrc` or `~/.bashrc` if it isn't:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Requirements

`python3` (3.6+) and `jq` must be installed. The script checks at startup and prints install instructions if either is missing.

```bash
# macOS — python3 is included with Xcode Command Line Tools
xcode-select --install   # if python3 is not already available
brew install jq

# Ubuntu / WSL2
sudo apt install python3 jq
```

> **Note:** On most macOS systems, `python3` is already available. Run `python3 --version` to check. If it prompts you to install developer tools, follow the prompt or run `xcode-select --install`.

## Quickstart

Try these two URLs right after installing to see the full range of output:

**A perfect score (no issues):**

```bash
metapeek https://r3.illinois.gov
```

```
metapeek — https://r3.illinois.gov

  Score: 100/100 (A)

  ✓ Title          100  Title is 28 characters
  ✓ Description    100  Description is 135 characters
  ✓ Open Graph     100  All required OG tags present
  ✓ OG Image       100  og:image is present and absolute
  ✓ Twitter Card   100  twitter:card is "summary_large_image"
  ✓ Canonical      100  Canonical URL is set
  ✓ Robots         100  No blocking directives

  0 issues found

  Analyzed in 234ms
  ✓ Pass (exit 0) — grade A
```

**A site with warnings:**

```bash
metapeek https://github.com
```

```
metapeek — https://github.com

  Score: 84/100 (B)

  ⚠ Title          60  Title is 61 characters
  ⚠ Description    60  Description is 186 characters
  ✓ Open Graph     100  All required OG tags present
  ✓ OG Image       100  og:image is present and absolute
  ✓ Twitter Card   100  twitter:card is "summary_large_image"
  ⚠ Canonical      60  Trailing slash inconsistency with og:url
  ✓ Robots         100  No blocking directives

  3 issues found

  Issues:

  ✗ Title
    • Title exceeds 60 characters (61)
    → Keep the title under 60 characters for best display in search results.

  ✗ Description
    • Description exceeds 160 characters (186)
    → Keep the meta description under 160 characters for best display in search results.

  ✗ Canonical
    • Trailing slash inconsistency with og:url
    → Canonical lacks trailing slash but og:url has it. Choose one format
      and use it consistently across canonical, og:url, and all meta tags.

  ─────────────────────────────────────────────────────────
  Copy for LLM
  ─────────────────────────────────────────────────────────

  URL: https://github.com
  Score: 84/100 (B)

  Issues:
  - Title exceeds 60 characters (61)
    Fix: Keep the title under 60 characters for best display in search results.
  - Description exceeds 160 characters (186)
    Fix: Keep the meta description under 160 characters for best display in search results.
  - Trailing slash inconsistency with og:url
    Fix: Canonical lacks trailing slash but og:url has it. Choose one format
    and use it consistently across canonical, og:url, and all meta tags.

  Analyzed in 268ms
  ✓ Pass (exit 0) — grade B
```

When issues or warnings are found, the output includes:

- **Issues detail** — each warning or failing category with its specific problems and a suggested fix
- **Copy for LLM** — a plain-text block you can copy-paste into ChatGPT, Claude, or any LLM to get help fixing the issues

## Usage

```
metapeek <url> [options]

Options:
  --json              Output raw JSON
  --format <type>     Output format: terminal (default) or markdown
  --no-color          Disable colored output
  --no-spinner        Disable loading spinner
  --tests             Run test suite
  -V, --version       Show version
  -h, --help          Show help
```

## More Examples

### JSON output

```bash
metapeek https://github.com --json
```

### Markdown output

```bash
metapeek https://github.com --format markdown
```

### Piping

```bash
metapeek https://github.com --json | jq .score.grade
```

## Exit Codes

Every run prints its exit status at the end of the output (e.g. `✓ Pass (exit 0) — grade A`), so the meaning is always visible.

| Code | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| 0    | Grade A or B                                                  |
| 1    | Grade C, D, or F                                              |
| 2    | Error (invalid URL, missing deps, network failure)            |

## Security

metapeek is hardened against common attack vectors:

- **ANSI injection prevention** — All analyzer output (both success and error messages) is sanitized to strip control characters before display, preventing malicious terminal escape sequences
- **Shell injection prevention** — URLs are properly quoted and encoded, preventing command injection via shell metacharacters
- **Protocol validation** — Only `http://` and `https://` URLs are accepted; `javascript:`, `data:`, `file://`, `ftp://`, and other schemes are rejected
- **Strict error handling** — The script runs with `set -euo pipefail` to catch errors early and prevent undefined behavior

All security measures are validated by 9 dedicated security tests in the test suite.

## Testing

metapeek includes a comprehensive test suite covering all features and edge cases.

### Run Tests

```bash
# Run all tests (includes live analysis)
./test/run.sh

# Run only offline tests (skip network-dependent tests)
./test/run.sh --offline
```

### Test Coverage

The test suite includes **54 tests** across 8 categories:

- **Flags & argument parsing** (13 tests) — validates all CLI options, version output, help text
- **Error handling** (10 tests) — invalid URLs, missing arguments, unknown options
- **URL normalization** (5 tests) — protocol prepending, validation of http/https/ftp/mailto/file schemes
- **Live analysis — terminal output** (10 tests) — score display, category rows, issues section, LLM copy block, exit hints
- **Live analysis — JSON output** (3 tests) — valid JSON structure, expected fields, no ANSI code leakage
- **Live analysis — markdown output** (3 tests) — heading format, table structure, result line
- **No-color output** (1 test) — ANSI escape sequence stripping
- **Security** (9 tests) — shell injection prevention, control character sanitization, protocol restrictions

Tests analyze `https://r3.illinois.gov` (grade A, no issues) and `https://github.com` (grade B, warnings for title/description length and trailing slash inconsistency) to verify output formatting.

### Test Output

Passing tests show a green checkmark (✓), failed tests show details:

```
  metapeek test suite
  ═══════════════════

  Flags & argument parsing
  ────────────────────────
  ✓ --help exits 0
  ✓ --version prints version
  ...

  ═══════════════════
  54 passed (54 total)
```

## License

MIT
