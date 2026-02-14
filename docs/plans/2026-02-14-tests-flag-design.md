# Design: --tests Flag for metapeek CLI

**Date:** 2026-02-14
**Status:** Approved

## Overview

Add a `--tests` flag to the metapeek CLI that runs the test suite inline and displays full results, following the early-exit pattern of `--help` and `--version`.

## Requirements

- Run `metapeek --tests` to execute the full test suite
- Display complete test output (all 56 tests with results)
- Exit with the test suite's exit code (0 for pass, non-zero for failures)
- Always run all tests (no `--offline` support)
- Keep implementation simple and maintainable

## Architecture

The `--tests` flag will be added to the argument parsing section (lines 134-161) as an early-exit command, similar to `--help` and `--version`. When encountered, it immediately executes the test suite using `exec` to replace the current process with the test runner, inheriting its exit code. This maintains the existing architectural pattern where informational/operational flags short-circuit normal URL analysis flow.

## Implementation

### Code Changes

1. Add `--tests` case to the argument parser switch statement (after line 137)
2. Use `exec` to replace the process with the test runner
3. Update the usage/help text to document the new flag

### Exact Changes

- **Line ~138:** Add case `--tests) exec "${BASH_SOURCE%/*}/test/run.sh" ;;`
- **Line ~120:** Add `--tests` to the help output options list

### Path Resolution

Use `${BASH_SOURCE%/*}` to get the script directory, then reference `test/run.sh` relative to it. This ensures the test script is found regardless of where `metapeek` is called from.

### Exit Behavior

Using `exec` means the test script replaces the current process, so its exit code (0 for all pass, non-zero for failures) becomes the exit code of `metapeek --tests`.

## Error Handling

### Missing Test Script

If `test/run.sh` doesn't exist or isn't executable, bash's `exec` will fail with "command not found" and exit with code 127. This is acceptable default behavior - if the test suite is missing, the error is clear.

### Test Suite Failures

Individual test failures are handled by the test suite itself. The `--tests` flag simply inherits whatever exit code the test runner produces (0 for all pass, non-zero for any failures).

### No Special Cases Needed

Since `--tests` is an early-exit flag that doesn't interact with URL validation, dependency checks, or API calls, there are no edge cases to handle. If a user provides both `--tests` and a URL (e.g., `metapeek --tests example.com`), the tests run and the URL is ignored - same behavior as `--help`.

## Testing

### Verification Steps

1. `metapeek --tests` - Should run full test suite and display all 56 tests with results
2. `echo $?` after running - Should be 0 (since all tests currently pass)
3. `metapeek --tests example.com` - Should run tests and ignore the URL argument
4. `metapeek --help` - Should show `--tests` in the options list

### Test Coverage

Add tests to `test/run.sh` to verify:
- `--tests` flag exits with 0 when tests pass
- `--tests` flag output contains test results
- Help text includes `--tests` option

### Manual Testing

Run the modified `metapeek --tests` to confirm:
- All existing tests still pass
- Output is identical to running `./test/run.sh` directly
- Exit codes match test suite results

## Alternatives Considered

### Post-Parse Execution

Parse `--tests` as a flag variable, then execute after all argument parsing completes. This would allow potentially respecting other flags like `--no-color`, but adds unnecessary complexity since the test suite doesn't currently support those options.

**Rejected because:** Over-engineered for this use case. Tests are a special operational mode that doesn't need to interact with analysis flags.

## Implementation Checklist

- [ ] Add `--tests` case to argument parser
- [ ] Update usage/help text
- [ ] Add tests for `--tests` flag
- [ ] Verify all existing tests still pass
- [ ] Update README documentation
