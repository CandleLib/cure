import util from "util";
import equal from "deep-equal";
import { performance } from "perf_hooks";
import { createTestHarnessEnvironmentInstance } from "../build/library/test_running/utilities/test_harness.js";
import { rst } from "../build/library/reporting/utilities/colors.js";

const {
    harness,
    harness_init,
    harness_getResults
} = createTestHarnessEnvironmentInstance(equal, util, performance, rst);


harness_init();

harness.pushTestResult();

harness.pushValue(0);
harness.pushValue(1);
harness.pushValue(2);
harness.pushValue(3);
harness.pushValue(4);
harness.pushValue(5);

assert(harness.getValueRange(1, 4) == [1, 2, 3, 4]);

assert(harness.or(1, 4) == true);

assert(harness.and(1, 4) == true);

harness_init();
harness.pushTestResult();
harness.pushValue(() => { throw 1; });
harness.pushValue(() => { return 1; });

assert(harness.doesNotThrow(harness.getValueRange(0, 0)) == false);
assert(harness.throws(harness.getValueRange(0, 0)) == true);

assert(harness.doesNotThrow(harness.getValueRange(1, 1)) == true);
assert(harness.throws(harness.getValueRange(1, 1)) == false);

assert(harness.equal(4, 4) == true);
assert(harness.equal([4], [4]) == true);
assert(harness.equal({ t: 4 }, { t: 4 }) == true);
assert(harness.equal({ t: 4 }, { p: 4 }) == false);

assert(harness.notEqual(4, 5) == true);
assert(harness.notEqual([4], [8]) == true);
assert(harness.notEqual({ t: 6 }, { t: 4 }) == true);
assert(harness.notEqual({ t: 4 }, { p: 4 }) == true);

harness.addException(new Error("Test Error"));
harness.popTestResult();

const results = harness_getResults();

assert(results[0].errors[0].summary == "Test Error");