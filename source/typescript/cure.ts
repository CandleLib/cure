/**
 * Copyright 2021
 * 
 * MIT License
 * 
 * Copyright (c) 2021 Anthony C. Weathersby
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 */


import { TestFrame } from "./types/test_frame.js";
import { Reporter } from "./types/reporter.js";
import { Outcome } from "./types/globals.js";

import { createTestFrame } from "./utilities/create_test_frame.js";

import { BasicReporter } from "./reporting/basic_reporter.js";
import { NullReporter } from "./reporting/null_reporter.js";
export { createTestSuite } from "./utilities/create_test_suite.js";
export {
    compileTestsFromString,
    compileTestsFromString as loadTests,
    compileTestsFromAST
} from "./loading/load_tests.js";

export * from "./types/plugin.js";
export * from "./types/config_script.js";

/**
 * Load everything into the global object
 */

////@ts-ignore Make harness available to all candle library modules.
const global_object = (typeof global !== "undefined") ? global : window;

if (global_object) {
    const cfw_test_data = { createTestFrame };
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
};


export * from "./utilities/stubs.js";