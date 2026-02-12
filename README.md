# metapeek-cli

CLI tool for analyzing meta tags and social sharing readiness. Powered by [MetaPeek](https://metapeek.icjia.app).

## Install

```bash
npm install -g metapeek-cli
```

Or use directly with npx:

```bash
npx metapeek-cli https://example.com
```

## Usage

```
metapeek-cli <url> [options]

Options:
  --json              Output raw JSON
  --format <type>     Output format: terminal (default) or markdown
  --api-url <url>     Override API endpoint (default: https://metapeek.icjia.app/api/analyze)
  --api-key <key>     API key for authenticated endpoints
  --no-color          Disable colored output
  --no-spinner        Disable loading spinner
  -V, --version       Show version
  -h, --help          Show help
```

## Examples

### Terminal output (default)

```bash
metapeek-cli https://r3.illinois.gov
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
```

### JSON output

```bash
metapeek-cli https://example.com --json
```

### Markdown output

```bash
metapeek-cli https://example.com --format markdown
```

### Piping

```bash
metapeek-cli https://example.com --json | jq .score.grade
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Grade A or B |
| 1 | Grade C, D, or F |
| 2 | Error (invalid URL, network failure, API error) |

## License

MIT
