import { Lexer } from "@candlefw/wind";
import {
    getSourceLineColumn,
    decodeJSONSourceMap,
    traverse,
} from "@candlefw/conflagrate";
import URL from "@candlefw/url";
import data from "../reporting/utilities/error_line_parser.js";
import { TransferableTestError } from "../types/test_error.js";
import { TestHarness } from "../types/test_harness.js";
import parser from "./parser.js";

export function testThrow() { /* ---------------- */ throw new Error("FOR TESTING"); };

interface StackTraceLocation {
    type: "location";

    url: URL | "anonymous";

    pos: [number, number, number?];

    sub_stack: undefined;
}
interface StackTraceCall {
    type: "call";
    call_id: string;
    sub_stack: (StackTraceCall | StackTraceLocation)[];
}

type StackTraceAst = StackTraceCall | StackTraceLocation;


function Call_Originated_In_Test_Source(node: StackTraceAst) {
    return node.type == "call"
        && node.call_id == "Object.eval"
        && node.sub_stack[0].type == "call"
        && node.sub_stack[0].call_id == "eval"
        && node.sub_stack[0]?.sub_stack?.[0]?.type == "call"
        && node.sub_stack[0]?.sub_stack?.[0]?.call_id == "createTest__cfwtest"
        && node.sub_stack[1].type == "location"
        && node.sub_stack[1].url == "anonymous";
}
export function compileTestErrorFromExceptionObject(error: Error, harness: TestHarness, error_location: string = "unknown"): TransferableTestError {
    if (error instanceof Error) {

        const { stack, message } = error;

        //only dig into files that are at the same root directory

        const { FAILED, result } = parser(stack.trim(), { URL: URL });

        const [stack_ast] = <StackTraceAst[][]>result;

        //Walk stack trace until we find a file that we can access.
        let results = [stack_ast];

        const cwd = new URL(harness.working_directory);

        let column = 0, line = 0, offset = 0, src = harness.source_location, source_map, CAN_RESOLVE_TO_SOURCE = false;

        if (!FAILED)
            for (const { node, meta } of traverse(<StackTraceAst>{ sub_stack: stack_ast }, "sub_stack").skipRoot()) {

                if (Call_Originated_In_Test_Source(node)) {

                    ([line, column] = (<StackTraceLocation>node.sub_stack[1]).pos);

                    source_map = decodeJSONSourceMap(harness.map);

                    ({ column, line } = getSourceLineColumn(line - 2, column, source_map));

                    column++;
                    line++;

                    CAN_RESOLVE_TO_SOURCE = true;

                    break;
                } else if (node.type == "location" && node.url !== "anonymous" && node.url.isSUBDIRECTORY_OF(cwd)) {
                    results = node;
                    ([line, column] = (node).pos);

                    src = node.url + "";

                    CAN_RESOLVE_TO_SOURCE = true;

                    //Load the test file and check for a source map


                    break;
                }
            }

        return {
            column,
            line,
            offset,
            source: src,
            summary: message,
            detail:
                [
                    `The object ${error} was passed to compileTestErrorFromExceptionObject.`,
                    `This object is not an instance of Error and cannot be parsed.`,
                ],
            CAN_RESOLVE_TO_SOURCE: false,
        };
    } else {
        return {
            column: 0,
            line: 0,
            offset: 0,
            source: error_location,
            summary: `An object that is not an instance of Error was passed to compileTestErrorFromExceptionObject`,
            detail:
                [
                    `The object ${error} was passed to compileTestErrorFromExceptionObject.`,
                    `This object is not an instance of Error and cannot be parsed.`,
                ],
            CAN_RESOLVE_TO_SOURCE: false,
        };
    }
}

export async function seekSourceFile(test_error: TransferableTestError, harness: TestHarness) {

    let { line, column, source } = test_error, origin = source;
    let
        source_url = new URL(source),
        active_url = source_url,
        map_source_url = null,
        source_text = "";

    const cwd = new URL(harness.working_directory);

    //Check for source map.
    //* 
    outer:
    while (true) {
        if (!active_url.isSUBDIRECTORY_OF(cwd)) break;
        source_text = (await active_url.fetchText());
        if (active_url.ext == "map") {
            let source_map = decodeJSONSourceMap(source_text);
            let sources = "";
            ({ column, line, source } = getSourceLineColumn(line, column, source_map));
            column++;
            line++;
            source_url = URL.resolveRelative(source, active_url);
            active_url = source_url;
        } else if (active_url.ext == "js" || active_url.ext == "ts") {
            for (const [, loc] of source_text.matchAll(/\/\/#\s*sourceMappingURL=(.+)/g)) {
                map_source_url = URL.resolveRelative(`./${loc}`, origin);
                active_url = map_source_url;
                continue outer;
            }
            break;
        }
    }
    source_text = (await source_url.fetchText());

    return { line, column, source_text, source: source_url };
}

export async function blame(test_error: TransferableTestError, harness: TestHarness) {

    const { source_text, line, column } = await seekSourceFile(test_error, harness);

    const string = new Lexer(source_text).seek(line - 1, column - 1).blame();

    return string.split("\n");
}

const blank: Set<string> = new Set();
/**
 * This object is used to report all errors that are caught within cfw.test, including
 * errors encountered within the various prep stages of the test framework.
 */
class TestError {

    /**
     * Name of the TestError object. 
     * 
     * Always set to `TestError`.
     */
    readonly name: string;

    match_source: string;

    replace_source: string;

    message: string;

    line: number;

    column: number;

    origin: string;

    original_error_stack: string;

    index: number;

    /**
     * True if the TestError object was created within a worker process.
     * 
     * This is necessary to detect if the prototype chain needs to be 
     * re-implemented after the TestError data has been passed back to 
     * the main thread.
     */
    WORKER: boolean;

    /**
     * If there error was created in order to inspect an object
     * this should be set to true
     */
    INSPECTION_ERROR: boolean;

    /**
     * Creates a TestError object.
     * 
     * This object is used to report all errors that are caught within cfw.test, including
     * errors encountered within the test framework itself.
     * 
     * @param {string | Error} message Error message or an error object.
     * @param line Line number of source file where error occurred.
     * @param column Column number of source file where error occurred.
     * @param match_source String to find in Error message. Used with replace_string to add highlighting to error message.
     * @param replace_source Used to add highlighting to error message.
     * @param accessible_files File paths that cfw.test is allowed to inspect for error reporting.
     * @param map @type {SourceMap} of the compiled @type {TestRig} source
     */
    constructor(message, origin = "", line = 0, column = 0, match_source = "", replace_source = "", map: string = null, WORKER = true) {


        if (message instanceof TestError) return message;

        this.name = "TestError";
        this.origin = origin;
        this.line = line;
        this.column = column;
        this.match_source = match_source;
        this.replace_source = replace_source;
        this.original_error_stack = "";
        this.index = -1;
        this.WORKER = WORKER;
        this.INSPECTION_ERROR = false;

        if (message instanceof Error) {

            const
                error: Error = message,

                /**
                 * if the error originate from test_harness.ts, through harness.inspect or some other 
                 * method, read the second stack trace source line, since the first source line will 
                 * be the directory of test_harness.js.
                 * 
                 */
                error_frame = error.stack.includes("test_harness.js") ? error.stack.split("\n")[2] : error.stack.split("\n")[1];

            this.message = error.message;// || error.name;

            this.original_error_stack = error.stack.split("\n").slice(1).join("\n");

            let { value, error: e } = lrParse<Array<StackTraceLocation>>(new Lexer(error_frame), <ParserData><any>data);


            if (e)
                return; //throw EvalError("Could not parse stack line");

            const loc = value.pop();

            if (loc?.type == "URL") {

                this.origin = loc.url;

                this.line = loc.line;

                this.column = loc.col;

                //*DEBUG*/  this.message += " " + JSON.stringify(out); //*/

            } else { // "ANONYMOUS" Error generated within a test rig.

                const { line: source_line, column: source_column }
                    = getSourceLineColumn(loc?.line - 2, loc?.col, decodeJSONSourceMap(map));

                this.line = source_line + 1;

                this.column = source_column + 1;

            }

        } else
            this.message = message;
    }

    /**
     * Creates a Wind Lexer that points to failure line/column in the source file.
     * Will read sourcemap data and follow mappings back to original file.
     */
    async blameSource(accessible_files: Set<string> = blank, origin_url: string = "")
        : Promise<{ lex: Lexer, origin: string; }> {

        let origin = accessible_files.has(this.origin) ? this.origin : origin_url;

        if (origin) {


            let { line, column } = this,
                data = (await (new URL(origin)).fetchText());

            //Check for source map.
            //* 
            while (data.includes("//#")) {
                for (const [, loc] of data.matchAll(/sourceMappingURL=(.+)/g)) {

                    const
                        source_map_url = URL.resolveRelative(`./${loc}`, origin),

                        source_map = await source_map_url.fetchText(),

                        { line: l, column: c, source: source_path }
                            = getPosFromSourceMapJSON(line, column, source_map),

                        source_url = URL.resolveRelative(source_path, source_map_url),

                        source = await source_url.fetchText();

                    origin = this.origin = source_url.path;
                    data = source;
                    column = c + 1;
                    line = l + 1;
                }
            }
            //*/;

            return { lex: getLexerFromLineColumnString(line, column, data, origin), origin };
        }

        return { lex: null, origin };
    }

    async toAsyncBlameString(accessible_files: Set<string> = blank, origin_url: string = "")
        : Promise<string> {


        const { lex, origin } = await this.blameSource(accessible_files, origin_url);

        const stack_data = (this.original_error_stack && !this.INSPECTION_ERROR)
            ? "\n" + this.original_error_stack
            : "";


        if (lex) {
            return `${lex.errorMessage(this.message, origin) + stack_data}`;
        } else
            return this.message;

    }

    toString() {
        return this.message;
    }
}

export function getPosFromSourceMapJSON(line, column, sourcemap_json_string) {
    const source_map = decodeJSONSourceMap(sourcemap_json_string);
    return getSourceLineColumn(line, column, source_map);
}

export function getLexerFromLineColumnString(line, column, string, origin = ""): Lexer {

    const lex = new Lexer(string);

    lex.source = origin;

    line -= 1;

    lex.CHARACTERS_ONLY = true;

    while (!lex.END && lex.line != line) { lex.next(); }
    while (!lex.END && lex.char < column) { lex.next(); };

    return lex;
}


export { TestError };