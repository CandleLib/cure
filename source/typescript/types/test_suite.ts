import URL from "@candlelib/uri";
import { THROWABLE_TEST_OBJECT_ID } from "../utilities/throwable_test_object_enum";
import { Test } from "./test";


/**
 * Stores TestRigs loaded from a test file.
 */
export interface TestSuite {
    throwable_id: THROWABLE_TEST_OBJECT_ID.TEST_SUITE,
    /**
     * The numerical order in which this TestSuite was created.
     */
    index: number;

    /**
     * An array of TestRigs this suite can run.
     */
    tests: Test[];

    /**
     * The original URL of the test file this suite is built from.
     */
    origin: string;

    /**
     * The character data of the source test file.
     */
    data: string;

    /**
     * The file name of the suite 
     */
    name: string;

    /**
     * Resolved URL to the source file
     */
    url: URL;
};
