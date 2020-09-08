/**[API]:testing
 *
 * Messages resulting from errors in tests should be informative,
 * clear, and take advantage of all available information to allow
 * user to intelligent actions to correct offending code.
 */

// Need to grab the test runner system, and a test suite with various
// error types.

import { createTestFrame, NullReporter } from "@candlefw/test";

const frame = createTestFrame({ WATCH: false, number_of_workers: 1, max_timeout: 300 }, "./test/data/error_message_test_spec.js");

frame.setReporter(new NullReporter());

const { results: [
    result1,
    result2,
    result3,
    result4,
    result5,
    result6,
    result7,
    result8,
    result9,
    result10,
    result11,
    result12,
    result13,
    result14
]
} = await frame.start();

SEQUENCE: {

    assert(result1.test.name == "9:53: Two different numbers are not the same");
    assert(result2.test.name == "11: Assignment expression error");
    assert(result3.test.name == "13: Object is not equal to number");
    assert(result4.test.name == "15: Object is not equal to number strict");
    assert(result5.test.name == "17: Invalid instanceof");
    assert(result6.test.name == "19: Invalid typeof");
    assert(result7.test.name == "21: Invalid more than");
    assert(result8.test.name == "23: Invalid more than equal");
    assert(result9.test.name == "25: Invalid less than");
    assert(result10.test.name == "27: Invalid less than equal");
    assert(result11.test.name == "29: This will time out");
    assert(result12.test.name == "31: This test will throw");
    assert(result13.test.name == "33: undefined");
    assert(result14.test.name == "37: This test should pass even though there is a harness inspection (console.log)");
    assert(result1.PASSED == false);
    assert(result2.PASSED == false);
    assert(result3.PASSED == false);
    assert(result4.PASSED == false);
    assert(result5.PASSED == false);
    assert(result6.PASSED == false);
    assert(result7.PASSED == false);
    assert(result8.PASSED == false);
    assert(result9.PASSED == false);
    assert(result10.PASSED == false);
    assert(result11.TIMED_OUT == true);
    assert(result12.PASSED == false);
    assert(result13.PASSED == false);
    assert(result14.PASSED == true);
    assert(result1.errors[0].line + 1 == 9);
    assert(result2.errors[0].line + 1 == 11);
    assert(result3.errors[0].line + 1 == 13);
    assert(result4.errors[0].line + 1 == 15);
    assert(result5.errors[0].line + 1 == 17);
    assert(result6.errors[0].line + 1 == 19);
    assert(result7.errors[0].line + 1 == 21);
    assert(result8.errors[0].line + 1 == 23);
    assert(result9.errors[0].line + 1 == 25);
    assert(result10.errors[0].line + 1 == 27);
    assert(result11.errors[0].line + 1 == 29);
    assert(result12.errors[0].line + 1 == 5);
    assert(result13.errors[0].line + 1 == 33);
    assert(result14.errors[0].line + 1 == 35);
}