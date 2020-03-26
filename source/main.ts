
import { TestFrame } from "./types/test_frame.js";
import { Reporter } from "./types/reporter.js";
import { Outcome } from "./types/globals.js";

import { loadBindingCompiler } from "./compile/assertion_site/assertion_compiler_manager.js";
import { createTestFrame } from "./utilities/create_test_frame.js";


import { BasicReporter } from "./reporting/basic_reporter.js";
import { NullReporter } from "./reporting/null_reporter.js";
import { harness } from "./test_running/test_harness.js";


/**
 * Load everything into the global object
 */

////@ts-ignore Make harness available to all modules.
const global_object = (typeof global !== "undefined") ? global : window;

if (global_object) {
    const cfw_test_data = { harness, createTestFrame };
    //@ts-ignore
    if (typeof global_object.cfw == "undefined") {
        //@ts-ignore
        global_object.cfw = { test: cfw_test_data };
        //@ts-ignore
    } else Object.assign(global.cfw, { test: cfw_test_data });
}

export {
    NullReporter,
    BasicReporter,
    Reporter,
    TestFrame,
    Outcome,
    createTestFrame,
    harness
};
