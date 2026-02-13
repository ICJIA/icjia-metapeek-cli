# metapeek

CLI tool for analyzing meta tags and social sharing readiness. Powered by [MetaPeek](https://metapeek.icjia.app).

## Install

Download the script to a directory in your `$PATH`:

```bash
curl -fsSL https://raw.githubusercontent.com/ICJIA/metapeek-cli/main/metapeek -o /usr/local/bin/metapeek && chmod +x /usr/local/bin/metapeek
```

Or clone and symlink:

```bash
git clone https://github.com/ICJIA/metapeek-cli.git
ln -s "$(pwd)/metapeek-cli/metapeek" /usr/local/bin/metapeek
```

## Requirements

`curl` and `jq` must be installed. The script checks at startup and prints install instructions if either is missing.

```bash
# macOS
brew install curl jq

# Ubuntu / WSL2
sudo apt install curl jq
```

## Quickstart

Try these two URLs right after installing to see the full range of output:

**A perfect score (no issues):**

```bash
metapeek https://r3.illinois.gov
```

```
MetaPeek — https://r3.illinois.gov

  Score: 100/100 (A)

  ✓ Title          100  Title tag present and optimal length
  ✓ Description    100  Meta description present and optimal length
  ✓ Open Graph     100  All required Open Graph tags present
  ✓ OG Image       100  og:image present with absolute URL
  ✓ Twitter Card   100  Twitter Card configured
  ✓ Canonical      100  Canonical URL present
  ✓ Robots         100  Robots meta tag present

  0 issues found

  Analyzed in 52ms
  ✓ Pass (exit 0) — grade A
```

**A site with issues:**

```bash
metapeek https://example.com
```

```
metapeek — https://example.com

  Score: 30/100 (F)

  ✓ Title          100  Title tag present and optimal length
  ✗ Description    0  Meta description missing
  ✗ Open Graph     0  Missing: og:title, og:description, og:image
  ✗ OG Image       0  og:image missing
  ✓ Twitter Card   100  Twitter Card tags optional (will fall back to Open Graph)
  ✗ Canonical      0  Canonical URL missing
  ✓ Robots         100  No robots restrictions (page will be indexed)

  4 issues found

  Issues:

  ✗ Description
    • Meta description missing
    → Add <meta name="description" content="...">

  ✗ Open Graph
    • Missing: og:title, og:description, og:image
    → Add all three core Open Graph tags for social media sharing

  ✗ OG Image
    • og:image missing
    → Add og:image — this is critical for social media previews

  ✗ Canonical
    • Canonical URL missing
    → Add <link rel="canonical" href="..."> to prevent duplicate content issues

  ╭─ Copy for LLM ──────────────────────────────────────────────────────────────────╮
  │                                                                                 │
  │  URL: https://example.com                                                       │
  │  Score: 30/100 (F)                                                              │
  │                                                                                 │
  │  Issues:                                                                        │
  │  - Meta description missing                                                     │
  │    Fix: Add <meta name="description" content="...">                             │
  │  - Missing: og:title, og:description, og:image                                  │
  │    Fix: Add all three core Open Graph tags for social media sharing              │
  │  - og:image missing                                                             │
  │    Fix: Add og:image — this is critical for social media previews               │
  │  - Canonical URL missing                                                        │
  │    Fix: Add <link rel="canonical" href="..."> to prevent duplicate content ...  │
  │                                                                                 │
  ╰─────────────────────────────────────────────────────────────────────────────────╯

  Analyzed in 97ms
  ✗ Fail (exit 1) — grade F
```

When issues are found, the output includes:

- **Issues detail** — each failing category with its specific problems and a suggested fix
- **Copy for LLM** — a plain-text block you can copy-paste into ChatGPT, Claude, or any LLM to get help fixing the issues

## Usage

```
metapeek <url> [options]

Options:
  --json              Output raw JSON
  --format <type>     Output format: terminal (default) or markdown
  --api-url <url>     Override API endpoint

  --no-color          Disable colored output
  --no-spinner        Disable loading spinner
  -V, --version       Show version
  -h, --help          Show help
```

## More Examples

### JSON output

```bash
metapeek https://example.com --json
```

### Markdown output

```bash
metapeek https://example.com --format markdown
```

### Piping

```bash
metapeek https://example.com --json | jq .score.grade
```

## Exit Codes

Every run prints its exit status at the end of the output (e.g. `✓ Pass (exit 0) — grade A`), so the meaning is always visible.

| Code | Meaning |
|------|---------|
| 0 | Grade A or B |
| 1 | Grade C, D, or F |
| 2 | Error (invalid URL, missing deps, network failure, API error) |

## License

MIT
