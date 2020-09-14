import { BasicReporter } from "../main.js";
import { TestResult } from "../types/test_result.js";
import { Globals } from "../types/globals.js";
import { CLITextDraw } from "../utilities/cli_text_console.js";

/**
 * Version of basic reporter that does not output intermediate test information
 */
export class CIReporter extends BasicReporter {

    constructor() { super(); }
    async update(results: Array<TestResult>, global: Globals, terminal: CLITextDraw, COMPLETE = false) {
        if (!COMPLETE) return "";
        return await super.update(results, global, terminal, COMPLETE);
    }
}
