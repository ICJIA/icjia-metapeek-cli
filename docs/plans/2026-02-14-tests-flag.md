# --tests Flag Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `--tests` flag to metapeek CLI that runs the test suite inline with full output.

**Architecture:** Follow the early-exit pattern of `--help` and `--version` flags. When `--tests` is detected during argument parsing, immediately exec the test runner script, replacing the current process and inheriting its exit code.

**Tech Stack:** Bash scripting, existing test suite at `test/run.sh`

---

## Task 1: Add tests for --tests flag behavior

**Files:**
- Modify: `test/run.sh` (add after line 100, before the "Error handling" section)

**Step 1: Write tests for --tests flag**

Add these test cases to `test/run.sh` after the "Flags & argument parsing" section (after line 112):

```bash
assert_exit "--tests exits with test suite code" 0 "$METAPEEK" --tests
assert_stdout_contains "--tests shows test output" "metapeek test suite" "$METAPEEK" --tests
```

**Step 2: Run tests to verify they fail**

Run: `./test/run.sh`

Expected: The new tests should FAIL because `--tests` flag doesn't exist yet.

**Step 3: Commit the failing tests**

```bash
git add test/run.sh
git commit -m "test: add tests for --tests flag"
```

---

## Task 2: Implement --tests flag in argument parser

**Files:**
- Modify: `metapeek:138` (add new case in the argument parser)

**Step 1: Add --tests case to argument parser**

In the `metapeek` script, add the `--tests` case right after the `--version` case (around line 138):

```bash
    -h|--help)    usage; exit 0 ;;
    -V|--version) echo "metapeek $VERSION"; exit 0 ;;
    --tests)      exec "${BASH_SOURCE%/*}/test/run.sh" ;;
    --json)       JSON_MODE=true; shift ;;
```

The complete case statement for `--tests`:
```bash
--tests)      exec "${BASH_SOURCE%/*}/test/run.sh" ;;
```

**Explanation:**
- `${BASH_SOURCE%/*}` gets the directory where the metapeek script is located
- `exec` replaces the current process with the test runner
- Exit code is inherited from the test runner (0 for pass, non-zero for failures)

**Step 2: Test the --tests flag**

Run: `./metapeek --tests`

Expected: Should run all 56 tests and display results, exit with code 0.

**Step 3: Verify tests now pass**

Run: `./test/run.sh`

Expected: All tests including the new `--tests` tests should PASS (58 tests total).

**Step 4: Commit the implementation**

```bash
git add metapeek
git commit -m "feat: add --tests flag to run test suite"
```

---

## Task 3: Update help text

**Files:**
- Modify: `metapeek:107-121` (usage function)

**Step 1: Add test for help text**

Add to `test/run.sh` after the existing help tests (around line 106):

```bash
assert_stdout_contains "--help shows --tests option" "--tests" "$METAPEEK" --help
```

**Step 2: Run test to verify it fails**

Run: `./test/run.sh`

Expected: New test should FAIL because help text doesn't mention `--tests` yet.

**Step 3: Update usage function**

In the `metapeek` script, update the `usage()` function (around lines 107-121) to include `--tests`:

```bash
usage() {
  banner
  cat <<'USAGE'
  Usage: metapeek <url> [options]

  Options:
    --json              Output raw JSON
    --format <type>     Output format: terminal (default) or markdown
    --api-url <url>     Override API endpoint

    --no-color          Disable colored output
    --no-spinner        Disable loading spinner
    --tests             Run test suite
    -V, --version       Show version
    -h, --help          Show help
USAGE
}
```

**Step 4: Verify help text**

Run: `./metapeek --help`

Expected: Should show `--tests` option in the help output.

**Step 5: Run tests to verify they pass**

Run: `./test/run.sh`

Expected: All 59 tests should PASS.

**Step 6: Commit the help text update**

```bash
git add metapeek test/run.sh
git commit -m "docs: add --tests flag to help text"
```

---

## Task 4: Verify edge cases

**Files:**
- Test manually (no file changes)

**Step 1: Test --tests with URL argument**

Run: `./metapeek --tests example.com`

Expected: Should run tests and ignore the URL (same as `--help` behavior).

**Step 2: Test --tests exit code on success**

Run:
```bash
./metapeek --tests
echo "Exit code: $?"
```

Expected: Exit code should be 0 (all tests pass).

**Step 3: Test path resolution**

Run from different directory:
```bash
cd /tmp
/Volumes/satechi/webdev/icjia-metapeek-cli/metapeek --tests
```

Expected: Tests should run successfully regardless of current directory.

**Step 4: Document verification**

Create a note documenting that all edge cases work as expected. No commit needed.

---

## Task 5: Update README

**Files:**
- Modify: `README.md` (add --tests to usage section)

**Step 1: Read current README**

Review the README to find the usage/options section.

**Step 2: Add --tests to README**

Add `--tests` flag documentation to the README's options/flags section. Look for where other flags like `--json`, `--format`, etc. are documented and add:

```markdown
- `--tests` - Run the test suite
```

**Step 3: Commit README update**

```bash
git add README.md
git commit -m "docs: document --tests flag in README"
```

---

## Task 6: Final verification

**Files:**
- Test manually (no file changes)

**Step 1: Run full test suite**

Run: `./metapeek --tests`

Expected: All 59 tests PASS.

**Step 2: Verify exit codes**

```bash
./metapeek --tests && echo "SUCCESS" || echo "FAILED"
```

Expected: Should print "SUCCESS".

**Step 3: Check git status**

Run: `git status`

Expected: Working directory should be clean (all changes committed).

**Step 4: Review all commits**

Run: `git log --oneline -6`

Expected: Should see 4-5 commits for this feature:
- test: add tests for --tests flag
- feat: add --tests flag to run test suite
- docs: add --tests flag to help text
- docs: document --tests flag in README

---

## Summary

Total commits: 4-5
Total tests added: 3
Files modified: 3 (metapeek, test/run.sh, README.md)
Estimated time: 15-20 minutes

The implementation follows TDD principles where possible, uses the established early-exit pattern, and includes comprehensive testing and documentation.
