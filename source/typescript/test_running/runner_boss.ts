import URL from "@candlefw/url";

import { Worker } from "worker_threads";
import { performance } from "perf_hooks";
import { TestRig } from "../types/test_rig.js";
import { TestResult } from "../types/test_result";
import { Globals } from "../types/globals.js";
import { TestError } from "./test_error.js";
import { prepareTestServer } from "./browser_runner.js";

let nonce = 0;

interface WorkerHandler {
    test: TestRig;

    DISCARD: boolean;

    READY: boolean;

    target: Worker;

    start: number;

    end: number;
}

export class RunnerBoss {

    number_of_workers: number;

    finished: Array<any>;

    workers: WorkerHandler[];

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

        this.module_url = module_url.replace("runner_boss.js", "runner_worker.js");

        this.finished = finished;

        this.workers = <WorkerHandler[]>(new Array(max_workers))
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

        worker.on("message", result => {
            finished.push(result);
            wkr.READY = true;
        });

        return worker;
    }

    createBrowserWorker(wkr, module_url = this.module_url) {

        const
            finished = this.finished,
            worker = new Worker(module_url);

        worker.on("error", e => {
            //globals.exit("Failed Worker", e);
            console.error(e);
        });

        worker.on("message", result => {
            finished.push(result);
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
    *  run(tests: Array<TestRig>, RELOAD_DEPENDS: boolean = false, globals: Globals): Generator<TestResult[]> {

        let completed = 0;

        //Reset any running workers
        this.loadWorkers(RELOAD_DEPENDS, this.workers);

        const
            server_tests = tests.filter(t => !t.BROWSER),
            browser_tests = tests.filter(t => !!t.BROWSER),
            server_workers = this.workers;

        const
            finished: TestResult[] = this.finished,
            number_of_tests = tests.length;

        finished.length = 0;

        if (browser_tests.length > 0)
            prepareTestServer(globals, browser_tests, finished);

        while (completed < number_of_tests) {

            let out: TestResult[] = null;

            //server tests
            this.runWorkers(server_tests, server_workers, finished);

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

    private async runWorkers(tests: TestRig[], workers: WorkerHandler[], finished: TestResult[], module?) {
        if (tests.length > 0) {
            for (const wkr of workers) {
                if (wkr.READY && tests.length > 0) {
                    const test = tests.shift();
                    if (test.error) {
                        finished.push({
                            start: 0,
                            end: 0,
                            duration: 0,
                            //@ts-ignore
                            errors: [test.error],
                            test: test,
                            TIMED_OUT: true,
                            PASSED: false
                        });
                    }
                    else {
                        wkr.test = test;
                        wkr.start = performance.now();
                        wkr.target.postMessage({ test: wkr.test });
                        wkr.READY = false;
                    }
                }

                if (!wkr.READY) {

                    const dur = performance.now() - wkr.start;

                    if (dur > 2000) {

                        wkr.target.terminate();
                        wkr.target = this.createWorker(wkr, module);
                        wkr.READY = true;

                        finished.push({
                            start: wkr.start,
                            end: wkr.start + dur,
                            duration: dur,
                            //@ts-ignore
                            errors: [new TestError("Test timed out at " + dur + " milliseconds", "", wkr.test.pos.line + 1, wkr.test.pos.column + 1)],
                            test: wkr.test,
                            TIMED_OUT: true,
                            PASSED: false
                        });
                    }
                }
            }
        }
    }
};

