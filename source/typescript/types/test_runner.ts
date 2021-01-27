import { Test } from "./test.js";
import { TestInfo } from "./test_info";

export interface TestRunner {
    runTest(test: Test): TestInfo[];
}
