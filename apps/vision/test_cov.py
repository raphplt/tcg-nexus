"""
Test runner and coverage reporter for the vision microservice.

Runs the unittest suite under `trace`, then measures coverage over every module
of `app/` — including the ones no test ever imported, which count as zero rather
than disappearing from the report.

The summary is also written to `coverage/coverage-summary.json` so the monorepo
aggregator (`scripts/run-all-coverage.ts`) can read real numbers instead of
parsing console output.
"""

import dis
import inspect
import json
import os
import tempfile
import trace
import unittest

APP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")
COVERAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "coverage")


def app_modules():
    """Absolute paths of every Python module shipped by the service."""
    return sorted(
        os.path.join(APP_DIR, name)
        for name in os.listdir(APP_DIR)
        if name.endswith(".py")
    )


def _walk_code(code):
    yield code
    for const in code.co_consts:
        if hasattr(const, "co_code"):
            yield from _walk_code(const)


def analyze(path):
    """Executable line numbers of a module, and the lines of each function."""
    with open(path, "r", encoding="utf-8") as handle:
        code = compile(handle.read(), path, "exec")

    executable = set()
    functions = []
    for block in _walk_code(code):
        lines = {line for _, line in dis.findlinestarts(block) if line is not None}
        executable |= lines
        # CO_OPTIMIZED tells real functions apart from module and class bodies,
        # which are code objects too; `<listcomp>` & co. are not functions either.
        is_function = bool(block.co_flags & inspect.CO_OPTIMIZED)
        if is_function and not block.co_name.startswith("<") and lines:
            functions.append(lines)

    return executable, functions


def pct(covered, total):
    # Nothing to cover counts as fully covered, as Istanbul reports it.
    return round(100.0 * covered / total, 2) if total else 100.0


def report(counts):
    hits = {(os.path.abspath(f), line) for (f, line), n in counts.items() if n > 0}

    rows = []
    lines_covered = lines_total = funcs_covered = funcs_total = 0

    for path in app_modules():
        executable, functions = analyze(path)
        covered = {line for line in executable if (path, line) in hits}
        hit_functions = [f for f in functions if f & {l for (p, l) in hits if p == path}]

        lines_covered += len(covered)
        lines_total += len(executable)
        funcs_covered += len(hit_functions)
        funcs_total += len(functions)

        rows.append(
            {
                "file": os.path.relpath(path, os.path.dirname(APP_DIR)),
                "lines_pct": pct(len(covered), len(executable)),
                "lines": f"{len(covered)}/{len(executable)}",
                "funcs_pct": pct(len(hit_functions), len(functions)),
            }
        )

    return rows, {
        "lines": pct(lines_covered, lines_total),
        "lines_covered": lines_covered,
        "lines_total": lines_total,
        "lines_ratio": f"{lines_covered}/{lines_total}",
        "functions": pct(funcs_covered, funcs_total),
        "functions_covered": funcs_covered,
        "functions_total": funcs_total,
        "functions_ratio": f"{funcs_covered}/{funcs_total}",
    }


def write_summary(total, result):
    os.makedirs(COVERAGE_DIR, exist_ok=True)
    summary = {
        "total": {
            "lines": {
                "pct": total["lines"],
                "covered": total["lines_covered"],
                "total": total["lines_total"],
            },
            # `trace` counts executed lines only: statements mirror lines and
            # branch coverage is simply not measurable here.
            "statements": {"pct": total["lines"]},
            "branches": {"pct": None},
            "functions": {
                "pct": total["functions"],
                "covered": total["functions_covered"],
                "total": total["functions_total"],
            },
        },
        "tests": {
            "passed": result.testsRun - len(result.failures) - len(result.errors),
            "failed": len(result.failures) + len(result.errors),
            "skipped": len(result.skipped),
            "total": result.testsRun,
        },
    }
    with open(os.path.join(COVERAGE_DIR, "coverage-summary.json"), "w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)
    return summary


def main():
    tracer = trace.Trace(count=1, trace=0, ignoredirs=[os.path.dirname(os.__file__)])

    def run_suite():
        # Discovery must happen inside runfunc: it imports the modules under
        # test, and their top-level lines would otherwise never be traced.
        suite = unittest.defaultTestLoader.discover(os.path.dirname(os.path.abspath(__file__)))
        return unittest.TextTestRunner(verbosity=1).run(suite)

    result = tracer.runfunc(run_suite)

    rows, total = report(tracer.results().counts)

    print("\n=============================== Coverage summary ===============================")
    print(f"{'file':<28} | {'line %':>8} | {'lines':>10} | {'funcs %':>8}")
    print("-" * 66)
    for row in rows:
        print(
            f"{row['file']:<28} | {row['lines_pct']:>7.2f}% | {row['lines']:>10} | {row['funcs_pct']:>7.2f}%"
        )
    print("-" * 66)
    print(
        f"{'all files':<28} | {total['lines']:>7.2f}% | {total['lines_ratio']:>10} | {total['functions']:>7.2f}%"
    )
    print("================================================================================\n")

    write_summary(total, result)

    if result.skipped:
        print(f"NOTE: {len(result.skipped)} test(s) skipped — install requirements.txt to run them.\n")

    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
