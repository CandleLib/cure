import url from "@candlelib/uri";
import parser from "../build/library/utilities/parser.js";

const v8_error_stack_string = `dfsf
    at Object.eval (eval at createTest (/test/build/library/test_running/utilities/create_test_function.js:21:72), <anonymous>:10:49)
    at /test/build/library/test_running/utilities/create_test_function.js:22:21
    at MessagePort.RunTest (/test/build/library/test_running/runners/desktop_worker.js:34:15)`;

const v8_error_stack_string2 = `TypeError: Cannot read property 'line' of undefined
    at Object.eval (eval at createTest__cfwtest (file:///compile.st_parser.debug/test/build/library/test_running/utilities/create_test_function.js:24:76), <anonymous>:702:45)
    at async MessagePort.RunTest (file:///compile.st_parser.debug/test/build/library/test_running/runners/desktop_worker.js:35:9)`;


const v8_error_stack_string3 = `ENOENT: no such file or directory, open '/cfw.workspace/packages/test/__temp__/build/library/test.js'

    at Object.openSync(fs.js: 476: 3)
    at Module.readFileSync(fs.js: 377: 35)
    at g.fetch(file:///cfw.workspace/packages/url/build/library/url.js:624:76)
    at file:///cfw.workspace/packages/url/build/library/url.js:25:9
    at new Promise(<anonymous>)
    at fetchLocalText (file:///cfw.workspace/packages/url/build/library/url.js:24:12)
    at URL.fetchText (file:///cfw.workspace/packages/url/build/library/url.js:328:16)
    at createSpecFile (file:///cfw.workspace/packages/test/build/library/utilities/instrument.js:12:84)
    at async instrument (file:///cfw.workspace/packages/test/build/library/utilities/instrument.js:94:142)
    at async Object.eval (eval at createTest__cfwtest (file:///cfw.workspace/packages/test/build/library/test_running/utilities/create_test_function.js:22:76), <anonymous>:29:9)`;

assert(parser(v8_error_stack_string, { URL: url }).FAILED == false);
assert(parser(v8_error_stack_string2, { URL: url }).FAILED == false);;
assert(parser(v8_error_stack_string3, { URL: url }).FAILED == false);;
