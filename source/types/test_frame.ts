import { Outcome } from "./globals";
import { Reporter } from "./reporter";

export type TestFrame = {

    /**
     * True if the argument WATCH was passed to test.
     */
    readonly WATCHED: boolean;

    /**
    * Will end testing and resolve the start promise.
    *
    * Only applicable when tests are being watched.
    */
    endWatchedTests: () => void;

    /**
    * Starts the test cycle.
    */
    start: () => Promise<Outcome>;

    /**
     * Set the reporter used to log test data.
     */
    setReporter: (reporter: Reporter) => void
};
