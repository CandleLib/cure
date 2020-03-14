import { Worker, workerData } from "worker_threads";
import { performance } from "perf_hooks";
import URL from "@candlefw/url";
import { Test } from "../types/test";


export class Runner {
    number_of_workers: number;

    finished: Array<any>;

    workers: Array<any>;

    module_url: string;

    constructor(max_workers: number = 2) {
        const
            finished = [],
            module_url = (process.platform == "win32")
                ? import.meta.url.replace(/file\:\/\/\//g, "")
                : (new URL(import.meta.url)).pathname;

        this.module_url = module_url.replace("runner.js", "runner_worker.js");
        this.finished = finished;
        this.workers = (new Array(max_workers))
            .fill(0)
            .map(() => ({ DISCARD: false, READY: false, target: null }));
    }

    createWorker(wkr, module_url = this.module_url) {
        const
            finished = this.finished,
            worker = new Worker(module_url);

        worker.on("error", e => { console.error(e); });

        worker.on("message", result => {
            finished.push(result);
            wkr.READY = true;
        });

        return worker;
    }
    destroy() {
        for (const wkr of this.workers)
            wkr.target.terminate();
    }
    * run(tests: Array<Test>, RELOAD_DEPENDS: boolean = false) {
        let id = 0, completed = 0;

        //Reset any running workers
        for (const wkr of this.workers) {
            if (!wkr.READY || RELOAD_DEPENDS) {

                if (wkr.target)
                    wkr.target.terminate();

                wkr.target = this.createWorker(wkr);
                wkr.READY = true;
                wkr.start = 0;
            }
        }

        const
            finished = this.finished,
            number_of_tests = tests.length;

        finished.length = 0;

        while (completed < number_of_tests) {

            let out = null;

            for (const wkr of this.workers) {

                if (wkr.READY && tests.length > 0) {
                    const test = tests.splice(0, 1)[0];

                    if (test.error) {
                        finished.push({
                            start: 0,
                            end: 0,
                            duration: 0,
                            error: test.error,
                            test: test,
                            TIMED_OUT: true
                        });
                    } else {
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
                        wkr.target = this.createWorker(wkr);
                        wkr.READY = true;

                        finished.push({
                            start: wkr.start,
                            end: wkr.start + dur,
                            duration: dur,
                            error: new Error("Test timed out at " + dur + " milliseconds"),
                            test: wkr.test,
                            TIMED_OUT: true
                        });
                    }
                }
            }

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
} 40;