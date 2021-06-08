import { exp, JSNodeClass } from "@candlelib/js";
import { AssertionReferenceName } from "../types/config_script";
import { TestRunner } from "../types/test_runner";

export function String_Is_A_JSReferenceName(input: string): input is AssertionReferenceName {
    try {

        const val = exp(input);

        return (val.type & JSNodeClass.IDENTIFIER) > 0;

    } catch (e) { /** Quietly allow the parse to fail */ }

    return false;
}

export function loadTestRunner(runner_candidate: TestRunner) {

}