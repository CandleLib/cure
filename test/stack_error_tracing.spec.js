import url from "@candlefw/url";
import parser from "../build/library/utilities/parser.js";

const v8_error_stack_string = `dfsf
    at Object.eval (eval at createTest (/test/build/library/test_running/utilities/create_test_function.js:21:72), <anonymous>:10:49)
    at /test/build/library/test_running/utilities/create_test_function.js:22:21
    at MessagePort.RunTest (/test/build/library/test_running/runners/desktop_worker.js:34:15)`;


assert(parser(v8_error_stack_string, { URL: url }).FAILED == false);
