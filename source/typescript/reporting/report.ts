import { CLITextDraw } from "./utilities/cli_text_console.js";
import { Globals } from "../types/globals.js";
import { TestInfo } from "../types/test_info.js";
import { Test } from "../types/test.js";

const c = new CLITextDraw();

export async function startBuild(pending_tests, global: Globals, term: CLITextDraw | Console = c) {
    if (global.reporter.buildStart)
        global.reporter.buildStart(pending_tests, global, term);
}

export async function updateBuild(pending_tests, global: Globals, term: CLITextDraw | Console = c) {
    if (global.reporter.buildUpdate)
        global.reporter.buildUpdate(pending_tests, global, term);
}

export async function completeBuild(pending_tests, global: Globals, term: CLITextDraw | Console = c) {
    if (global.reporter.buildComplete)
        global.reporter.buildComplete(pending_tests, global, term);
}

export async function startRun(initialized_tests: Test[], global: Globals, term: CLITextDraw | Console = c) {
    return global.reporter.start(initialized_tests, global, term);
}

export async function updateRun(updated_tests: TestInfo[], global: Globals, term: CLITextDraw | Console = c) {
    return global.reporter.update(updated_tests, global, term);
}

export async function completedRun(completed_tests: TestInfo[], global: Globals, term: CLITextDraw | Console = c) {
    return global.reporter.complete(completed_tests, global, term);
}