import { Globals } from "../types/globals.js";
import { TestSuite } from "../types/test_suite.js";
import { createHierarchalName } from "./name_hierarchy.js";

export function createSuiteError(globals: Globals, suite: TestSuite, e: Error | number, error_message: string) {

    if (typeof e != "number") {

        globals.harness.pushTestResult();

        globals.harness.setResultName(createHierarchalName("Internal Suite Error", suite.origin, error_message));

        globals.harness.addException(e);

        globals.harness.popTestResult();
    }
}

export function createTestError(globals: Globals, suite: TestSuite, e: Error | number, error_message: string) {

    if (typeof e != "number") {

        globals.harness.pushTestResult();

        globals.harness.setResultName(createHierarchalName("Internal Test Error", suite.origin, error_message));

        globals.harness.addException(e);

        globals.harness.popTestResult();
    }
}


export function createGlobalError(globals: Globals, e: Error | number, error_message: string) {

    if (typeof e != "number") {

        globals.harness.pushTestResult();

        globals.harness.setResultName(createHierarchalName("Internal Library Error", error_message));

        globals.harness.addException(e);

        globals.harness.popTestResult();
    }

    throw 0;
}

export function assertionSiteSoftError(globals: Globals, e: Error | number, error_message: string) {

    globals.harness.pushTestResult();

    globals.harness.setResultName(createHierarchalName("Assertion Site Error", error_message));

    globals.harness.addException(e);

    globals.harness.popTestResult();

}


export function createNameErrorMessage(index): any {
    return `Identity Error[${index}]: This is an internal error. See https://github.com/CandleLibrary/test/library_errors.md`;
}