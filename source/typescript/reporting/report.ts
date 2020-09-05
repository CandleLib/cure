import { CLITextDraw } from "../utilities/cli_text_console.js";
import { BasicReporter } from "./basic_reporter.js";
import { Reporter } from "../types/reporter.js";
import { Globals } from "../types/globals.js";

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

export async function startRun(pending_tests, global: Globals, term: CLITextDraw | Console = c) {
    return global.reporter.start(pending_tests, global, term);
}

export async function updateRun(completed_tests, global: Globals, term: CLITextDraw | Console = c) {
    return global.reporter.update(completed_tests, global, term);
}

export async function completedRun(completed_tests, global: Globals, term: CLITextDraw | Console = c) {
    return global.reporter.complete(completed_tests, global, term);
}