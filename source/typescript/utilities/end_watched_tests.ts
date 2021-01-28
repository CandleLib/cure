import { Globals, Outcome } from "../types/globals";


export function endWatchedTests(globals: Globals, resolution: (arg: Outcome) => void) {

    for (const watcher of globals.watchers)
        watcher.close();

    if (globals.runner)
        globals.runner.destroy();

    if (resolution) {

        if (globals.outcome) {

            globals.outcome.rigs = [];

            for (const suite of globals.suites.values()) {

                for (const test_rig of suite.tests)
                    globals.outcome.rigs.push(test_rig);
            }

            resolution(globals.outcome);

        }

        else
            resolution(globals.outcome);
    }
}
