import { Reporter } from "../types/reporter";

/**
 * Does nothing other than resolves `await NullReporter.complete()` with `true`.
 * 
 * @module Reporter
 */
export class NullReporter implements Reporter {

    async notify() {

    }
    async start(pending_tests, globals, console) {
    }
    async update(results, globals, console) {
    }
    async complete(results, globals, console) {
        return true;
    }
}