import { c_fail, c_reset } from "./colors.js";

/**
 * Kills the process after reporting why. Process will exit with code *255 / -1*
 * 
 * @param {Error} error The error that lead to the fatal exception
 * @param {string} why_we_are_fatally_failing A message explaining why this particular error is leading to a fatal exit.
 */
export function fatalExit(error: Error, why_we_are_fatally_failing: string) {
    console.error(c_fail + "    " + error.stack.split("\n").join("\n    ") + c_reset);
    console.log(why_we_are_fatally_failing);
    process.exit(-1);
}
