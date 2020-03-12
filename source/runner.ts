import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { performance } from "perf_hooks";

const makeLiteral = (s) => {
    switch (typeof (s)) {
        case "string":
            return `"${s}"`;
        default:
            return s;
    }
};

class AssertionError extends Error { };

if (!isMainThread) {

    const SourceMaps: Map<string, any> = new Map();

    parentPort.on("message", async (test: TestUnit) => {

        const result = { start: performance.now(), end: 0, errors: [], test, TIMED_OUT: false },
            { test_function_object_args: args,
                import_arg_specifiers: spec,
                import_module_sources: sources,
            } = test;

        try {

            for (const source of sources) {
                if (!SourceMaps.has(source))
                    SourceMaps.set(source, await import(source));
            }


            const
                testFunction = new (test.async ? Function : Function)(...args),

                //Create arg_map
                test_args = [makeLiteral, (...v) => {
                    return new AssertionError(...v);
                }, ...spec.map(e => {
                    const module = SourceMaps.get(e.module_specifier);
                    return module[e.module_name];
                })];

            testFunction(...test_args);

        } catch (e) {
            result.errors.push(e);
        }
        result.end = performance.now();

        parentPort.postMessage(result);
        //*/
    });
}
type TestUnit = {

};

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

        this.module_url = module_url;
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
    * run(tests: Array<TestUnit>) {
        let id = 0, completed = 0;

        //Reset any running workers
        for (const wkr of this.workers) {
            if (!wkr.READY) {

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
                    wkr.READY = false;
                    wkr.test = tests.splice(0, 1)[0];;
                    wkr.start = performance.now();
                    wkr.target.postMessage(wkr.test);
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
                            errors: [new Error("Test timed out at " + dur + " milliseconds")],
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
}