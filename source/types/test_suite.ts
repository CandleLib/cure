import { TestError } from "../test_running/test_error";
import { TestRig } from "./test_rig";


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
    rigs: TestRig[];

    /**
     * The original URL of the test file this suite is built from.
     */
    origin: string;

    /**
     * An error object if an exception was thrown during TestRig compilation.
     */
    error?: Error | TestError;
};
