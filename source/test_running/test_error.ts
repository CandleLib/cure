
import { lrParse, ParserData } from "@candlefw/hydrocarbon";
import { Lexer } from "@candlefw/wind";
import {
    getSourceLineColumn,
    decodeJSONSourceMap,
} from "@candlefw/conflagrate";

import data from "../utilities/error_line_parser.js";
import { inspect, harness } from "./test_harness.js";
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
    constructor(message, origin = harness.origin, line = 0, column = 0, match_source = "", replace_source = "", accessible_files: Set<string> = null, map: string = null, WORKER = true) {

        this.name = "TestError";
        this.origin = origin;
        this.line = line + 1;
        this.column = column + 1;
        this.match_source = match_source;
        this.replace_source = replace_source;
        this.original_error_stack = "";
        this.index = -1;
        this.WORKER = WORKER;

        if (message instanceof Error) {

            const
                error: Error = message,
                error_frame = error.stack.split("\n")[1];

            this.message = error.message;

            this.original_error_stack = error.stack;
            let out = lrParse<Array<StackTraceLocation>>(new Lexer(error_frame), data, {});

            if (!out)
                return; //throw EvalError("Could not parse stack line");

            if (out.error)
                return; //throw out.error;

            const loc = out.value.pop();

            if (loc.type == "URL") {

                if (accessible_files.has(loc.url)) {

                    this.origin = loc.url;

                    this.line = loc.line;

                    this.column = loc.col;

                } else {

                    this.message = error.stack;

                    this.message += JSON.stringify(out);

                    this.origin = "";
                }

            } else { // "ANONYMOUS"

                const { line: source_line, column: source_column }
                    = getSourceLineColumn(loc.line, loc.col, decodeJSONSourceMap(map));

                this.line = source_line;

                this.column = source_column;

                this.message = error.message;
            }

        } else {
            this.message = message;
        }
    }

    /**
     * Creates a Wind Lexer that points to failure line/column in the source file.
     * Will read sourcemap data and follow mappings back to original file.
     */
    async blameSource(): Promise<Lexer> {

        let
            origin = this.origin,
            line = this.line - 1,
            col = this.column - 1,
            data = (await (new URL(origin)).fetchText());

        //Check for source map.
        for (const [, loc] of data.matchAll(/sourceMappingURL=(.+)/g)) {
            const
                source_map_url = URL.resolveRelative(`./${loc}`, origin),
                source_map = decodeJSONSourceMap(await source_map_url.fetchText()),
                { line: l, column: c, source: source_path } = getSourceLineColumn(line + 1, col + 1, source_map),
                source_url = URL.resolveRelative(source_path, source_map_url),
                source = await source_url.fetchText();
            origin = source_url.path;
            data = source;
            col = c;
            line = l;
        }

        const lex = new Lexer(data);

        lex.CHARACTERS_ONLY = true;

        while (!lex.END) {
            if (lex.line == line && lex.char >= col) break;
            lex.next();
        }

        return lex;
    }
}


export { TestError };