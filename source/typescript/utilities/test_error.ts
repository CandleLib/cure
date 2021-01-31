import {
    decodeJSONSourceMap, getSourceLineColumn,
    traverse
} from "@candlefw/conflagrate";
import URL from "@candlefw/url";
import { Lexer } from "@candlefw/wind";
import { TransferableTestError } from "../types/test_error.js";
import { TestHarness } from "../types/test_harness.js";
import parser from "./parser.js";
import { StackTraceCall, StackTraceLocation, StackTraceAst } from "../types/stack_trace";



/* DO NOT MOVE OR REMOVE THE FOLLOWING LINE ----------------- DO NOT MOVE OR REMOVE THE FOLLOWING LINES */
// <-- EXCEPTION TO ABOVE RULE: Ensure these lines (including comments) are on line numbers 14, 15, 16, 17
export function testThrow() { /* ---------------- */ throw new Error("FOR TESTING"); };
/* END -------------------------------------------------------------------------------------------- END */

/**
 * 
 * @param node 
 */

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

/**
 * 
 * @param error 
 * @param harness 
 * @param error_location 
 */
export function createTestErrorFromErrorObject(
    error: Error,
    harness: TestHarness,
    error_location: string = "unknown"
): TransferableTestError {
    if (error instanceof Error) {

        const { stack, message } = error;

        //only dig into files that are at the same root directory

        const { FAILED, result } = parser(stack.trim(), { URL: URL });

        const [stack_ast] = <StackTraceAst[][]>result;

        const cwd = new URL(harness.working_directory);

        let column = 0, line = 0, offset = 0, src = harness.source_location, source_map, CAN_RESOLVE_TO_SOURCE = false;

        if (!FAILED)
            for (const { node, meta } of traverse(<StackTraceAst>{ sub_stack: stack_ast }, "sub_stack").skipRoot()) {

                if (Call_Originated_In_Test_Source(node)) {

                    ([line, column] = (<StackTraceLocation>node.sub_stack[1]).pos);

                    source_map = harness.test_source_map;

                    ({ column, line } = getSourceLineColumn(
                        /** Line offset due to extra code the Function constructor adds to the test source */
                        line - 2,
                        column,
                        source_map
                    ));

                    //column++;
                    //line++;

                    CAN_RESOLVE_TO_SOURCE = true;

                    break;
                } else if (node.type == "location" && node.url !== "anonymous" && node.url.isSUBDIRECTORY_OF(cwd)) {

                    ([line, column] = (node).pos);

                    src = node.url + "";

                    CAN_RESOLVE_TO_SOURCE = true;

                    break;
                } else if (
                    node.type == "call"
                    && node.sub_stack.length == 1
                    && node.sub_stack[0].type == "location"
                    && node.sub_stack[0].url !== "anonymous"
                    && node.sub_stack[0].url.isSUBDIRECTORY_OF(cwd)
                ) {
                    const location = node.sub_stack[0];

                    ([line, column] = (location).pos);

                    src = location.url + "";

                    CAN_RESOLVE_TO_SOURCE = true;

                    break;
                }
            }

        return {
            column,
            line,
            offset,
            source: src,
            summary: message.split("\n").pop(),
            detail: (stack || message).split("\n"),
            CAN_RESOLVE_TO_SOURCE,
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


export function createTestErrorFromString(msg, harness: TestHarness): TransferableTestError {
    return createTestErrorFromErrorObject(new Error(msg), harness);
}
export async function seekSourceFile(test_error: TransferableTestError, harness: TestHarness) {

    let
        { line, column, source } = test_error, origin = source,
        source_url = new URL(source),
        active_url = source_url,
        map_source_url = null,
        source_text = "";

    const cwd = new URL(harness.working_directory);

    outer: while (true) {
        if (!active_url.isSUBDIRECTORY_OF(cwd)) break;
        source_text = (await active_url.fetchText());
        if (active_url.ext == "map") {

            let source_map = decodeJSONSourceMap(source_text);

            ({ column, line, source } = getSourceLineColumn(line, column, source_map));

            source_url = URL.resolveRelative(source, active_url);

            active_url = source_url;

            continue;
        } else if (active_url.ext == "js" || active_url.ext == "ts") {
            for (const [, loc] of source_text.matchAll(/\/\/#\s*sourceMappingURL=(.+)/g)) {
                map_source_url = URL.resolveRelative(`./${loc}`, origin);
                active_url = map_source_url;
                continue outer;
            }
            break;
        }
        break;
    }

    source_text = (await source_url.fetchText());

    return { line, column, source_text, source: source_url };
}

export async function blame(test_error: TransferableTestError, harness: TestHarness) {

    const { source_text, line, column } = await seekSourceFile(test_error, harness);

    const string = new Lexer(source_text).seek(line, column).blame();

    return string.split("\n");
}

export function getPosFromSourceMapJSON(line, column, sourcemap_json_string) {
    const source_map = decodeJSONSourceMap(sourcemap_json_string);
    return getSourceLineColumn(line, column, source_map);
}

export function getLexerFromLineColumnString(line, column, string): Lexer {
    return new Lexer(string).seek(line, column);
}