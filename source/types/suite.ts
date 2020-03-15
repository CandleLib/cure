import { TestAssertionError } from "./test_error";
import { Test } from "./test";

export type Suite = {
    /**
     * Name givin to the test.
     */
    name: string;
    /**
     * Tests this suite runs
     */
    tests: Test[];
    /**
     * The original url of the suite
     */
    origin: string;
    /**
     * An error object if an exception was thrown during test compilation.
     */
    error?: Error | TestAssertionError;
};
