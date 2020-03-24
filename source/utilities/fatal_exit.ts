import { Globals } from "source/types/globals.js";

/**
 * Kills the TestFrame, returning an error as to why the frame was ended.
 * 
 * @param {Error} error The error that lead to the fatal exception
 * @param {string} why_we_are_fatally_failing A message explaining why this particular error is leading to a fatal exit.
 */
export function fatalExit(error: Error, why_we_are_fatally_failing: string, globals: Globals) {
    globals.exit(why_we_are_fatally_failing, error);
}
