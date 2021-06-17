import { BasicReporter } from "../cure.js";
import { TestInfo } from "../types/test_info.js";
import { Globals } from "../types/globals.js";
import { CLITextDraw } from "./utilities/cli_text_console.js";
import { Test } from "../types/test.js";

/**
 * Version of basic reporter that does not output intermediate test information
 */
export class CIReporter extends BasicReporter {

    constructor() { super(); }


    async start(pending_tests: Test[], global: Globals, terminal: CLITextDraw) {
        super.start(pending_tests, global, terminal);
        terminal.CLEAR_SCREEN = false;
    }
    async update(results: Array<TestInfo>, global: Globals, terminal: CLITextDraw, COMPLETE = false) {
        if (!COMPLETE) return;
        terminal.CLEAR_SCREEN = false;
        return await super.update(results, global, terminal, true);
    }
}
