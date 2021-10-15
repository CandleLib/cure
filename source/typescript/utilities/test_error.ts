import { decodeJSONSourceMap, getSourceLineColumn, traverse } from "@candlelib/conflagrate";
import URL from "@candlelib/uri";
import { Lexer } from "@candlelib/wind";

import { createTest__cfwtest } from "../test_running/utilities/create_test_function.js";
import loader from "./error_parser.js";
import { THROWABLE_TEST_OBJECT_ID } from "./throwable_test_object_enum.js";

import { AssertionSite } from "../types/assertion_site.js";
import { Globals } from "../types/globals.js";
import { StackTraceAst, StackTraceLocation } from "../types/stack_trace";
import { Test } from "../types/test.js";
import { TransferableTestError } from "../types/test_error.js";
import { TestHarness } from "../types/test_harness.js";
import { TestInfo } from "../types/test_info.js";
import { TestSuite } from "../types/test_suite.js";

const { parse: parser } = await loader;

const test_function_name = createTest__cfwtest.name;
/**
 * 
 * @param node 
 */

function Call_Originated_In_Test_Source(node: StackTraceAst) {

    return node.type == "call"
        && (node.call_id == "Object.eval" || node.call_id == "asyncObject.eval")
        && node.sub_stack[0].type == "call"
        && node.sub_stack[0].call_id == "eval"
        && node.sub_stack[0]?.sub_stack?.[0]?.type == "call"
        && node.sub_stack[0]?.sub_stack?.[0]?.call_id == "createTest__cfwtest"
        && node.sub_stack[1].type == "location"
        && node.sub_stack[1].url == "anonymous";
}

type ErrorObjectTarget =
    | TransferableTestError
    | AssertionSite
    | Error
    | Test
    | TestSuite
    | Globals;

/**
 * Creates a TransferableTestError with appropriate blame information based
 * on the object type assigned to `target`
 * @param target 
 * @param message 
 * @param harness 
 */
export function createTargetedTestError(target: ErrorObjectTarget, message: string, harness: TestHarness, error?: Error): TransferableTestError {

    if (target instanceof Error) {
        return createTransferableTestErrorFromException(target, harness);
    } else switch (target.throwable_id) {

        case THROWABLE_TEST_OBJECT_ID.TRANSFERABLE_ERROR:
            return target;

        case THROWABLE_TEST_OBJECT_ID.GLOBALS:
            //Represents a general compilation error
            break;

        case THROWABLE_TEST_OBJECT_ID.ASSERTION_SITE:

            return createTransferableTestError(
                target.source_path,
                message,
                target.pos,
                [`Source location ${target.source_path}:${target.pos.line + 1}:${target.pos.char}`],
                true
            );

        case THROWABLE_TEST_OBJECT_ID.TEST:
            // The assertion site 
            break;

        case THROWABLE_TEST_OBJECT_ID.TEST_SUITE:
            // The assertion site 
            break;
    }

}

function createTransferableTestError(source_path, message: string, pos: { column: number, line: number; }, detail_lines: string[] = [], CAN_BLAME: boolean = false): TransferableTestError {
    return <TransferableTestError>{
        throwable_id: THROWABLE_TEST_OBJECT_ID.TRANSFERABLE_ERROR,
        summary: message,
        detail: detail_lines,
        source_path,
        offset: 0,
        column: pos.column,
        line: pos.line + 1,
        CAN_RESOLVE_TO_SOURCE: CAN_BLAME,
    };
}

/**
 * 
 * @param error 
 * @param harness 
 * @param error_location 
 */
export function createTransferableTestErrorFromException(
    error: Error,
    harness: TestHarness,
    error_location: string = "unknown"
): TransferableTestError {
    if (error instanceof Error) {

        const { stack, message } = error;

        //only dig into files that are at the same root directory

        const { FAILED, result, error_message } = parser(stack.trim(), { URL: URL });

        const [stack_ast] = <StackTraceAst[][]>result;

        const cwd = new URL(harness.working_directory);

        let column = 0, line = 0, stack_location = "", src = harness.source_location, source_map, CAN_RESOLVE_TO_SOURCE = false;

        if (!FAILED)
            for (const { node, meta } of traverse(<StackTraceAst>{ sub_stack: stack_ast }, "sub_stack").skipRoot()) {

                if (Call_Originated_In_Test_Source(node)) {

                    ([line, column] = (<StackTraceLocation>node.sub_stack[1]).pos);

                    source_map = harness.test_source_map;

                    if (source_map)
                        ({ column, line } = getSourceLineColumn(
                            /** Line offset due to extra code the Function constructor adds to the test source */
                            line - 2,
                            column,
                            source_map
                        ));


                    line--;

                    CAN_RESOLVE_TO_SOURCE = true;
                    stack_location = src + ":" + (line + 1) + ":" + column;

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

                    line--;

                    stack_location = "    at package file " + src + ":" + (line + 1) + ":" + column;

                    break;
                }
            }

        const transfer_error = createTransferableTestError(
            src,
            message.split("\n").pop(),
            { line, column },
            (stack_location + "\n" + stack.split("\n").slice(1).join("\n")).split("\n"),
            CAN_RESOLVE_TO_SOURCE
        );

        return transfer_error;

    } else {
        return createTransferableTestError(
            error_location,
            `An object that is not an instance of Error was passed to compileTestErrorFromExceptionObject`,
            { line: 0, column: 0 },
        );
    }
}


export function createTestErrorFromString(msg, harness: TestHarness): TransferableTestError {
    return createTransferableTestErrorFromException(new Error(msg), harness);
}
export async function seekSourceFile(test_error: { column: number, line: number, source_path: string; }, harness: TestHarness) {

    try {
        let
            { line, column, source_path: source } = test_error, origin = source,
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

        return { line, column, source_text, source_url };
    } catch (e) {

        return null;
    }

}

export async function blame(test_error: TransferableTestError, harness: TestHarness) {

    const result = await seekSourceFile(test_error, harness);

    if (result) {

        const { source_text, source_url, line, column } = result;

        const string = new Lexer(source_text).seek(line, column).blame();

        return [source_url + ":" + line + ":" + column, ...string.split("\n")];
    }

    return [];
}


export async function blameAssertionSite(test: Test, test_result: TestInfo, harness: TestHarness) {

    const result = await seekSourceFile({ line: test.pos.line + 1, column: test.pos.column, source_path: test.source_location }, harness);

    if (result) {

        const { source_text, line, column, source_url } = result;

        const string = new Lexer(source_text).seek(line, column).blame();

        return [source_url + ":" + line + ":" + column, ...string.split("\n")];
    }

    return [];
}

export function getPosFromSourceMapJSON(line, column, sourcemap_json_string) {
    const source_map = decodeJSONSourceMap(sourcemap_json_string);
    return getSourceLineColumn(line, column, source_map);
}

export function getLexerFromLineColumnString(line, column, string): Lexer {
    return new Lexer(string).seek(line, column);
}

