
"Test errors";

import { createTestFrame, NullReporter } from "../build/library/main.js";


"The function createTestFrame should not throw";
((createTestFrame()));

/**
 * We'll build a test frame that will run tests that 
 * we'll evaluate thru the object interface. 
 */
const
    frame = createTestFrame({ WATCH: false, number_of_workers: 1 }, "./test/internal.spec.js");

frame.setReporter(new NullReporter());

const data = await frame.start();

{
    "Test";

    "Number of workers should equal 1";
    ((frame.number_of_workers == 1));

    "Test data should not be null";
    ((data != null));

    "Only 10 results should be available";
    ((data.results.length === 11));

    "Chai assert test 1 in internal.spec.js should fail due to undefined `assert`";
    ((data.results[2].error.message == "assert is not defined"));

    "Chai assert test 2 in internal.spec.js should fail due to undefined `a`";
    ((data.results[3].error.message == "a is not defined"));

    "Chai assert test 3 in internal.spec.js should fail due to an assertion thrown by chai";
    ((data.results[4].error.message == "expected a+1 to equal 2: expected 3 to equal 2"));

    "Chai assert test 4 should pass";
    ((data.results[5].PASSED == true));

    "Undeterminable test [ ((data)); ] should fail";
    ((data.results[6].PASSED == false));

    "False inequality should fail: [((1 < 1))];";
    ((data.results[7].PASSED == false));

    "Strict equality should fail:  [((1 === '1'))]";
    ((data.results[8].PASSED == false));

    "Equality test [ ((1 == `1`)); ] should pass";
    ((data.results[9].PASSED == true));
}

{
    "Reporters";

    "The NullReport update method should return true";
    ((data.results[10].PASSED == true));
}