import { c_fail, c_reset } from "./colors.js";

import { Globals } from "source/types/globals.js";

/**
 * Kills the process after reporting why. Process will exit with code *255 / -1*
 * 
 * @param {Error} error The error that lead to the fatal exception
 * @param {string} why_we_are_fatally_failing A message explaining why this particular error is leading to a fatal exit.
 */
export function fatalExit(error: Error, why_we_are_fatally_failing: string, globals: Globals) {

    const error_string = [];

    error_string.push(c_fail + "    " + error.stack.split("\n").join("\n    ") + c_reset);

    error_string.push(why_we_are_fatally_failing);

    globals.exit(new Error(error_string.join("\n")));
}
