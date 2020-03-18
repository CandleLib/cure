import { rst } from "./colors.js";

import { Globals } from "source/types/globals.js";

/**
 * Kills the TestFrame, returning an error as to why the frame was ended.
 * 
 * @param {Error} error The error that lead to the fatal exception
 * @param {string} why_we_are_fatally_failing A message explaining why this particular error is leading to a fatal exit.
 */
export function fatalExit(error: Error, why_we_are_fatally_failing: string, globals: Globals) {

    const error_string = [],
        { fail } = globals.reporter.colors;

    error_string.push(fail + "    " + error.stack.split("\n").join("\n    ") + rst);

    error_string.push(why_we_are_fatally_failing);

    globals.exit(new Error(error_string.join("\n")));
}
