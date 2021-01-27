import { TestError } from "../utilities/test_error";
import { Test } from "./test";


/**
 * Stores TestRigs loaded from a test file.
 */
export interface TestSuite {
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
     * An error object if an exception was thrown during TestRig compilation.
     */
    error?: TestError;

    /**
     * The character data of the source test file.
     */
    data: string;

    /**
     * The file name of the suite 
     */
    name: string;
};
