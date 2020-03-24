
"Test errors";

import { createTestFrame, NullReporter } from "../build/library/main.js";

"The function createTestFrame should not throw";
((createTestFrame()));

SEQUENCE: {
    /**
     * We'll build a test frame that will run tests that 
     * will evaluate thru the outcome interface. 
     */
    const frame = createTestFrame({ WATCH: false, number_of_workers: 1 }, "./test/internal.spec.js");

    frame.setReporter(new NullReporter());

    const outcome = await frame.start();

    "Test";

    "Number of workers should equal 1";
    ((frame.number_of_workers == 1));

    "Test data should not be null";
    ((outcome != null));

    "Only 11 results should be available";
    ((outcome.results.length === 11));

    "Chai assert test 1 in internal.spec.js should fail due to undefined `assert`";
    ((outcome.results[2].errors[0].message == "assert is not defined"));

    "Chai assert test 2 in internal.spec.js should fail due to undefined `a`";
    ((outcome.results[3].errors[0].message == "a is not defined"));

    "Chai assert test 3 in internal.spec.js should fail due to an assertion thrown by chai";
    ((outcome.results[4].errors[0].message == "expected a+1 to equal 2: expected 3 to equal 2"));

    "Chai assert test 4 should pass";
    ((outcome.results[5].PASSED == true));

    "Undeterminable test [ ((data)); ] should fail";
    ((outcome.results[6].PASSED == false));

    "False inequality should fail: [((1 < 1))];";
    ((outcome.results[7].PASSED == false));

    "Strict equality should fail:  [((1 === '1'))]";
    ((outcome.results[8].PASSED == false));

    "Equality test [ ((1 == `1`)); ] should pass";
    ((outcome.results[9].PASSED == true));
}

SEQUENCE: {
    const frame = createTestFrame({ WATCH: false, number_of_workers: 1 }, "./test/internal.spec.js");

    frame.setReporter(new NullReporter());

    const outcome = await frame.start();

    "Reporters";

    "The NullReport update method should return true";
    ((outcome.results[10].PASSED == true));
}


SEQUENCE: {
    "Iteration";

    const frame = createTestFrame({ WATCH: false, number_of_workers: 1 }, "./test/sequence.spec.js");

    frame.setReporter(new NullReporter());

    const outcome = await frame.start();

    "Test data should not be null";
    ((outcome != null));

    "Only 11 results should be available";

    ((outcome.results.length === 11));

    "Tests outside a SEQUENCE:{} relying on side effects of previous tests should fail"; "#";

    ((outcome.results[0].PASSED == true));

    ((outcome.results[1].PASSED == false));

    ((outcome.results[2].PASSED == false));

    ((outcome.results[3].PASSED == false));

    ((outcome.results[4].PASSED == false));


    "Tests inside a SEQUENCE:{} relying on previous test side effects should pass"; "#";

    ((outcome.results[5].PASSED == true));

    ((outcome.results[6].PASSED == true));

    ((outcome.results[7].PASSED == true));

    ((outcome.results[8].PASSED == true));

    ((outcome.results[9].PASSED == true));

    ((outcome.results[10].PASSED == true));
}
