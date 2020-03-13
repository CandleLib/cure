import { CLITextDraw } from "../cli_text_console.js";
import { BasicReporter } from "./basic_reporter.js";

const Console = new CLITextDraw();
export async function startRun(pending_tests, suites, reporter = new BasicReporter()) {
    return reporter.start(pending_tests, suites, Console);
}

export async function updateRun(completed_tests, suites, reporter = new BasicReporter()) {
    return reporter.update(completed_tests, suites, Console);
}

export async function completedRun(completed_tests, suites, reporter = new BasicReporter()) {
    return reporter.complete(completed_tests, suites, Console);
}