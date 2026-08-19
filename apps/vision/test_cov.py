import os
import tempfile
import trace
import unittest


def main():
    tracer = trace.Trace(
        count=1,
        trace=0,
        ignoredirs=[os.path.dirname(os.__file__)],
    )

    suite = unittest.defaultTestLoader.discover(os.path.dirname(__file__))
    runner = unittest.TextTestRunner(verbosity=1)
    res = tracer.runfunc(runner.run, suite)

    print("\n=============================== Coverage summary ===============================")
    results = tracer.results()
    results.write_results(show_missing=True, summary=True, coverdir=tempfile.gettempdir())
    print("================================================================================\n")

    return 0 if res.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
