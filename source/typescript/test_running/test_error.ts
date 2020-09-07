
import { lrParse, ParserData } from "@candlefw/hydrocarbon";
import { Lexer } from "@candlefw/wind";
import {
    getSourceLineColumn,
    decodeJSONSourceMap,
} from "@candlefw/conflagrate";

import data from "../utilities/error_line_parser.js";
import URL from "@candlefw/url";


type StackTraceLocation = {
    type: "URL";
    col: number;
    line: number;
    protocol: string;
    url: string;
} | {
    type: "ANONYMOUS";
    col: number;
    line: number;
};

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

        this.name = "TestError";
        this.origin = origin;
        this.line = line - 1;
        this.column = column - 1;
        this.match_source = match_source;
        this.replace_source = replace_source;
        this.original_error_stack = "";
        this.index = -1;
        this.WORKER = WORKER;

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

            this.original_error_stack = error.stack;
            let out = lrParse<Array<StackTraceLocation>>(new Lexer(error_frame), data);

            if (!out)
                return; //throw EvalError("Could not parse stack line");

            if (out.error)
                return; //throw out.error;

            const loc = out.value.pop();

            if (loc?.type == "URL") {

                this.origin = loc.url;

                this.line = loc.line;

                this.column = loc.col;

                //*DEBUG*/  this.message += " " + JSON.stringify(out); //*/

            } else { // "ANONYMOUS"

                const { line: source_line, column: source_column }
                    = getSourceLineColumn(loc?.line, loc?.col, decodeJSONSourceMap(map));

                this.line = source_line;

                this.column = source_column;
            }

        } else {
            this.message = message;
        }
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
            ///* 
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
                    column = c;
                    line = l;
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

        const stack_data = this.original_error_stack
            ? "\n Original Error: " + this.original_error_stack
            : "";


        if (lex) {
            return `${
                lex.errorMessage(this.message, origin) + stack_data}`;
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

    while (!lex.END) {
        if (lex.line == line && lex.char >= column) break;
        lex.next();
    }

    return lex;
}

export { TestError };