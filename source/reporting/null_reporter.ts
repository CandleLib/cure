import { Reporter } from "source/types/reporter";
/**
 * Does nothing other than resolves `await nullreporter.complete()` with `true`.
 */
export class NullReporter implements Reporter {
    async start(pending_tests, suites, console) {
    }
    async update(results, suites, console) {
    }
    async complete(results, suites, console) {
        return true;
    }
}