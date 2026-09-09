"""Run the required vision suite, rejecting empty discovery and skipped tests."""

from pathlib import Path
import sys
import unittest


def main() -> int:
    """Discover vision regressions and fail if required dependencies are missing."""
    directory = Path(__file__).resolve().parents[1] / "apps" / "vision"
    suite = unittest.defaultTestLoader.discover(str(directory))
    if suite.countTestCases() == 0:
        print("No vision tests discovered.", file=sys.stderr)
        return 1
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if result.skipped:
        print("Required vision tests were skipped; install apps/vision/requirements.txt.", file=sys.stderr)
        return 1
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
