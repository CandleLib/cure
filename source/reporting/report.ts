import { CLITextDraw } from "../utilities/cli_text_console.js";
import { BasicReporter } from "./basic_reporter.js";

const c = new CLITextDraw();
export async function startRun(pending_tests, suites, reporter = new BasicReporter(), console: CLITextDraw | Console = c) {
    return reporter.start(pending_tests, suites, console);
}

export async function updateRun(completed_tests, suites, reporter = new BasicReporter(), console: CLITextDraw | Console = c) {
    return reporter.update(completed_tests, suites, console);
}

export async function completedRun(completed_tests, suites, reporter = new BasicReporter(), console: CLITextDraw | Console = c) {
    return reporter.complete(completed_tests, suites, console);
}