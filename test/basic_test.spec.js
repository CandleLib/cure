
import { createTestFrame, NullReporter } from "../build/library/cure.js";

assert("The function createTestFrame should not throw", createTestFrame());

assert_group("Test", sequence, () => {
    /**
     * We'll build a test frame that will run tests that 
     * will evaluate thru the outcome interface. 
     */
    const frame = createTestFrame({ WATCH: false, number_of_workers: 1 }, "./test/data/internal.mock_spec.js");

    frame.setReporter(new NullReporter());

    const outcome = await frame.start();

    assert(frame.number_of_workers == 1,
        "Number of workers should equal 1");

    assert(outcome != undefined,
        "Test data should not be null");

    assert(outcome.results.length === 11,
        "Only 11 results should be available");

    assert(outcome.results[2].errors[0].summary == "assert is not defined",
        "Chai assert test 1 in internal.mock_spec.js should fail due to undefined `assert`");

    assert(outcome.results[3].errors[0].summary == "a is not defined",
        "Chai assert test 2 in internal.mock_spec.js should fail due to undefined `a`");

    assert(outcome.results[4].PASSED == false,
        "Chai assert test 3 in internal.mock_spec.js should fail due to an assertion thrown by chai");

    assert(outcome.results[5].PASSED == true, "Chai assert test 4 should pass");

    assert(outcome.results[6].PASSED == false, "Undeterminable test[((data) ] should fail");

    assert(outcome.results[7].PASSED == false, "False inequality should fail: [((1 < 1))];");

    assert(outcome.results[8].PASSED == false, "Strict equality should fail:  [((1 === '1'))]");

    assert(outcome.results[9].PASSED == true, "Equality test[((1 == `1`) ] should pass");
});

assert_group("Iteration", sequence, () => {

    const frame = createTestFrame({ WATCH: false, number_of_workers: 1 }, "./test/data/sequence.mock_spec.js");

    frame.setReporter(new NullReporter());

    const outcome = await frame.start();

    assert("Test data should not be null", outcome != null);

    assert("Only 11 results should be available", outcome.results.length === 11);

    assert_group("Tests outside a SEQUENCE:{} relying on side effects of previous tests should fail", sequence, () => {

        assert(outcome.results[0].PASSED == true);

        assert(outcome.results[1].PASSED == false);

        assert(outcome.results[2].PASSED == false);

        assert(outcome.results[3].PASSED == false);

        assert(outcome.results[4].PASSED == false);
    });

    assert_group("Tests inside a SEQUENCE:{} relying on previous test side effects should pass", sequence, () => {

        assert(outcome.results[5].PASSED == true);

        assert(outcome.results[6].PASSED == true);

        assert(outcome.results[7].PASSED == true);

        assert(outcome.results[8].PASSED == true);

        assert(outcome.results[9].PASSED == true);

        assert(outcome.results[10].PASSED == true);
    });
});
