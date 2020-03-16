import URL from "@candlefw/url";
import { lrParse, ParserData } from "@candlefw/hydrocarbon";
import { Lexer } from "@candlefw/whind";
import { Source } from "./test";
import data from "../utilities/error_line_parser.js";

import {
    getPositionLexerFromJSONSourceMap,
    getSourceLineColumn,
    decodeJSONSourceMap
} from "@candlefw/conflagrate";

export class TestAssertionError {

    name: string;

    IS_TEST_ERROR: boolean;

    match_source: string;

    replace_source: string;

    message: string;

    line: number;

    column: number;

    origin: string;

    constructor(message, line, column, match_source, replace_source, sources: Source[] = null, map = null) {

        this.name = "TestAssertionError";
        this.origin = "";
        this.IS_TEST_ERROR = true;
        this.line = line;
        this.column = column;
        this.match_source = match_source;
        this.replace_source = replace_source;

        if (message instanceof Error) {

            const
                error: Error = message,
                error_frame = error.stack.split("\n")[1],
                out = lrParse(new Lexer(error_frame), data, {}).value,
                loc = out.locations.pop();

            this.message = error.message;

            if (loc.type == "URL") {

                let RELATIVE_MATCH = false;

                for (const source of sources) {

                    if (source.IS_RELATIVE) {

                        if (source.module_source == loc.url) {

                            RELATIVE_MATCH = true;

                            this.origin = (new URL(data[0])).path;

                            this.line = loc.line;

                            this.column = loc.column;

                            break;
                        }
                    }
                }

                if (!RELATIVE_MATCH) {

                    this.message = error.stack;

                    this.origin = "";
                }

            } else {

                const { line: source_line, column: source_column }
                    = getSourceLineColumn(loc.line, loc.col, decodeJSONSourceMap(map));

                this.line = source_line;

                this.column = source_column;

                this.message = error.message;

                this.origin = "";
            }

        } else {
            this.message = message;
        }
    }
}
