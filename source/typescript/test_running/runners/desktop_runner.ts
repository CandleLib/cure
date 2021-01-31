import URL from "@candlefw/url";
import { performance } from "perf_hooks";
import { Worker } from "worker_threads";
import { DesktopWorkerHandle } from "../../types/desktop_worker_handle";
import { Globals } from "../../types/globals.js";
import { Test } from "../../types/test.js";
import { TestInfo } from "../../types/test_info";
import { TestRunner } from "../../types/test_runner";
import { createTestErrorFromString } from "../../utilities/test_error.js";


let nonce = 0;

export class DesktopRunner implements TestRunner {

    number_of_workers: number;

    finished: Array<any>;

    workers: DesktopWorkerHandle[];

    module_url: string;

    browser_module_url: string;

    id: number;

    constructor(max_workers: number = 1) {

        const
            finished = [],
            module_url = (process.platform == "win32")
                ? import.meta.url.replace(/file\:\/\/\/ /g, "")
                : (new URL(import.meta.url)).pathname;

        this.id = nonce++;

        this.module_url = module_url.replace("desktop_runner.js", "desktop_worker.js");

        this.finished = finished;

        this.workers = <DesktopWorkerHandle[]>(new Array(max_workers))
            .fill(0)
            .map(() => ({ DISCARD: false, READY: false, target: null }));
    }

    createWorker(wkr, module_url = this.module_url) {

        const
            finished = this.finished,
            worker = new Worker(module_url);

        worker.on("error", e => {
            //globals.exit("Failed Worker", e);
            console.error(e);
        });

        worker.on("message", (results: TestInfo[]) => {
            results.forEach(res => res.test = wkr.test);
            finished.push(results);
            wkr.READY = true;
        });

        return worker;
    }

    destroy() {
        for (const wkr of this.workers) {
            if (wkr.target)
                wkr.target.terminate();
        }
    }

    /**
     * REMOVE  - No longer need to access this data in worker.
     * Sends a set list of local files to the worker process.
     * 
     * @param wkr A runner_worker reference,
     * @param globals The globals object @type {Globals} 
     * 
     * ```js
     initiateTestRun(wkr, globals: Globals) {
         wkr.target.postMessage({ accessible_files: [...globals.watched_files_map.keys()] });
        }
        ```
    */
    /**
     * Start a test run series. Yields arrays of @type {TestResult}. Returns when all tests
     * have completed or timed out.
     * 
     * @param tests - Pending test rigs. 
     * @param RELOAD_DEPENDS - If `true`, reinitialize all workers.
     * @param globals - The Globals object.
     */
    *  run(tests: Array<Test>, RELOAD_DEPENDS: boolean = false, globals: Globals): Generator<TestInfo[][]> {

        let completed = 0;

        //Reset any running workers
        this.loadWorkers(RELOAD_DEPENDS, this.workers);

        const
            server_tests = tests,//.filter(t => !t.BROWSER),
            //browser_tests = tests.filter(t => !!t.BROWSER),
            server_workers = this.workers;

        const
            finished: TestInfo[][] = this.finished,
            number_of_tests = tests.length;

        finished.length = 0;

        //if (browser_tests.length > 0)
        //    prepareTestServer(globals, browser_tests, finished);

        while (completed < number_of_tests) {

            let out: TestInfo[][] = null;

            //server tests
            this.runWorkers(server_tests, server_workers, finished, globals);

            if (finished.length > 0) {
                out = finished.slice();
                completed += out.length;
                finished.length = 0;
            }

            yield out;
        }

        finished.length = 0;

        return;
    }

    private loadWorkers(RELOAD_DEPENDS: boolean, workers, url?) {
        for (const wkr of workers) {

            if (!wkr.READY || RELOAD_DEPENDS) {

                if (wkr.target)
                    wkr.target.terminate();

                wkr.target = this.createWorker(wkr, url);
                wkr.READY = true;
                wkr.start = 0;
            }

            //* REMOVE - No longer need to access this data in worker. */ this.initiateTestRun(wkr, globals);
        }
    }

    private async runWorkers(tests: Test[], workers: DesktopWorkerHandle[], finished: TestInfo[][], globals: Globals) {

        if (tests.length > 0 || workers.some(wkr => !wkr.READY)) {
            for (const wkr of workers) {

                if (wkr.READY && tests.length > 0) {
                    const test = tests.shift();
                    wkr.test = test;
                    wkr.start = performance.now();
                    wkr.target.postMessage({ test: wkr.test });
                    wkr.READY = false;
                }

                if (!wkr.READY) {

                    const dur = performance.now() - wkr.start;

                    if (dur > wkr.test.timeout_limit) {

                        wkr.target.terminate();
                        wkr.target = this.createWorker(wkr);
                        wkr.READY = true;

                        if (wkr.test.retries > 0) {
                            wkr.test.retries--;
                            tests.push(wkr.test);
                        } else {
                            finished.push([<TestInfo>{
                                name: "Test Timed Out",
                                clipboard_start: wkr.start,
                                clipboard_write_start: wkr.start,
                                previous_clipboard_end: wkr.start,
                                clipboard_end: wkr.start + dur,
                                location: {
                                    compiled: { column: wkr.test.pos.column, line: wkr.test.pos.line, offset: wkr.test.pos.off, },
                                    source: { column: wkr.test.pos.column, line: wkr.test.pos.line, offset: wkr.test.pos.off, }
                                },
                                logs: [],
                                message: "",
                                //@ts-ignore
                                errors: [createTestErrorFromString("Test timed out at " + dur + " milliseconds", globals.harness)],
                                test: wkr.test,
                                TIMED_OUT: true,
                                PASSED: false
                            }]);
                        }
                    }
                }
            }
        }
    }
}



