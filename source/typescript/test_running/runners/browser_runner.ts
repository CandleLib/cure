import { Logger, LogLevel } from '@candlelib/log';
import { getPackageJsonObject } from '@candlelib/paraffin';
import spark from "@candlelib/spark";
import URI from '@candlelib/uri';
import { spawn } from "child_process";
import { Globals } from "../../types/globals.js";
import { Test } from "../../types/test.js";
import { TestInfo } from "../../types/test_info.js";
import { TestRunner, TestRunnerRequest, TestRunnerResponse } from "../../types/test_runner.js";


export class BrowserRunner implements TestRunner {

    static active_runner: BrowserRunner;
    static server: any;
    static resource_directory: string;
    static SERVER_LOADED: boolean;
    static port: number;
    respond: TestRunnerResponse;
    request: TestRunnerRequest;
    STOP_ALL_ACTIVITY: boolean;

    to_complete: number;

    globals: Globals;

    kill_switch: () => void;

    constructor() {
        this.STOP_ALL_ACTIVITY = false;
        this.to_complete = 0;
    }

    Can_Accept_Test(test: Test) { return !!test.BROWSER; }

    complete() {
        this.respond = null;
        this.request = null;
        this.STOP_ALL_ACTIVITY = true;
    }

    close() {
        if (this.kill_switch)
            this.kill_switch();

        if (BrowserRunner.server) {
            BrowserRunner.server.close();
            BrowserRunner.server = null;
        }
    }

    async init(globals: Globals, request, respond) {

        this.respond = respond;
        this.request = request;
        this.STOP_ALL_ACTIVITY = false;

        if (!BrowserRunner.SERVER_LOADED) {

            BrowserRunner.resource_directory = globals.test_dir + "source/browser/";

            this.kill_switch = await BrowserRunner.setupServer(globals);

            BrowserRunner.SERVER_LOADED = true;
        }

        BrowserRunner.active_runner = this;

        this.run();
    }

    private async run() {

        while (!this.STOP_ALL_ACTIVITY) {
            // Allow other cooperative tasks to run
            await spark.sleep(1);
        }
    }

    static async setupServer(globals: Globals): Promise<() => void> {
        Logger.get("lantern").activate();
        const {
            default: lantern,
            $404_dispatch,
            candle_library_dispatch,
            filesystem_dispatch,
        } = await import("@candlelib/lantern");

        const port = await lantern.getUnusedPort();
        const root_directory = (await getPackageJsonObject(new URI(import.meta.url).path)).package_dir;
        BrowserRunner.resource_directory =
            root_directory
            + "/source/browser/";
        Logger.get("lantern").deactivate();

        BrowserRunner.server = await lantern({
            cwd: BrowserRunner.resource_directory,
            type: "http2",
            port,
            host: "0.0.0.0",
            secure: lantern.mock_certificate,
            log: lantern.null_logger
        });

        const
            { server } = BrowserRunner,
            server_test = [];

        server.addDispatch(
            {
                name: "RESOLVE_TEST_RIG",
                description: "Browser responding with the results of a test",
                MIME: "application/json",
                respond: async function (tools) {

                    const test_results: { test_id: number, results: TestInfo[]; } = await tools.getJSONasObject();

                    if (test_results) {


                        const { results, test_id } = test_results;

                        const test = server_test[test_id];

                        server_test[test_id] = null;

                        results.forEach(res => res.test = test);

                        BrowserRunner.active_runner.respond(test, ...results);

                        return tools.sendUTF8String(JSON.stringify({ "completed": (--BrowserRunner.active_runner.to_complete) == 0 }));
                    }

                    return tools.sendUTF8String(JSON.stringify({ "completed": "false" }));
                },
                keys: { ext: server.ext.all, dir: "/test_rigs/resolve/" }
            },
            {
                name: "RETRIEVE_TEST_RIG",
                description: "Browser requesting a new test rig to run",
                MIME: "application/json",
                respond: async (tools) => {

                    if (BrowserRunner.active_runner.request) {


                        const test = await BrowserRunner.active_runner.request(BrowserRunner.active_runner);

                        if (test) {
                            const id = server_test.push(test) - 1;

                            return tools.sendUTF8String(JSON.stringify({ test_id: id, test }));
                        }

                    }

                    return tools.sendUTF8String(JSON.stringify({ "NO_TESTS_NEED_TO_WAIT": true }));

                },
                keys: { ext: server.ext.all, dir: "/test_rigs/acquire/" }
            },
            {
                name: "TEST_HARNESS",
                description: "Return test_harness file",
                MIME: "application/javascript",
                respond: async function (tools) {
                    tools.setMIME();
                    const str = await tools.getUTF8FromFile(root_directory + "/build/library" + tools.url.path);
                    return tools.sendUTF8String(str.replace(/\"\@candlelib\/([^\/\"]+)\/?/g, "\"/@cl\/$1/"));
                },
                keys: { ext: server.ext.all, dir: "/test_running/utilities/" }
            },
            {
                name: "TEST_HARNESS_UTILITES",
                description: "Return test_harness file",
                MIME: "application/javascript",
                respond: async function (tools) {
                    tools.setMIME();
                    const str = await tools.getUTF8FromFile(root_directory + "/build/library" + tools.url.path);
                    return tools.sendUTF8String(str.replace(/\"\@candlelib\/([^\/\"]+)\/?/g, "\"/@cl\/$1/"));
                },
                keys: { ext: server.ext.all, dir: "/utilities/*" }
            },
            {
                name: "GLOBAL_DATA",
                description: "Retrieve Global Data",
                MIME: "application/json",
                respond: async function (tools) {
                    tools.setMIME();
                    return tools.sendUTF8String(JSON.stringify(globals));
                },
                keys: { ext: server.ext.all, dir: "/globals/acquire/" }
            },
            candle_library_dispatch,

            {
                name: "Test Files",
                description: "Loads files from test dir of the tested repo",
                MIME: "text/html",
                respond: async function (tools) {
                    if (tools.filename !== "")
                        return false;

                    tools.setMIMEBasedOnExt();

                    return tools.sendRawStreamFromFile([globals.package_dir, "test/", tools.pathname].join(("/")).replace(/\/\//g, "/"));
                },
                keys: { ext: server.ext.all, dir: "/test/*" }
            },
            filesystem_dispatch,
            $404_dispatch
        );


        //start a dedicated instance of a browser
        await spark.sleep(100);

        //startFirefox(port, globals);
        let bowser_kill_switch = startChrome(port, globals);

        return () => {
            bowser_kill_switch();
        };
    }
}

function startFirefox(port, globals: Globals) {
    const browser = spawn("firefox",
        [
            (globals.flags.USE_HEADLESS_BROWSER) ? `-headless` : "",
            '-new-instance',
            `https://localhost:${port}/`
        ],
        { detached: true, stdio: ['ignore', process.stdout, process.stderr], env: process.env }
    );

    browser.on('close', (code) => {
        Logger.get("cure").get("browser").get("firefox")
            .activate(LogLevel.INFO).log(`child process exited with code ${code}`);
    });

    process.on("SIGTERM", () => {
        browser.kill("SIGKILL");
        //browser.kill();
        return false;
    });

    process.on("exit", () => {
        browser.kill("SIGTERM");
    });
}


function startChrome(port, globals: Globals): () => void {
    const browser = spawn("google-chrome",
        [
            // https://github.com/GoogleChrome/chrome-launcher/blob/master/docs/chrome-flags-for-tools.md#--enable-automation
            '--allow-insecure-localhost',
            `--user-data-dir=/tmp`,
            '--process-per-tab',
            '--new-window',
            '--enable-automation',
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--disable-translate',
            "--use-mock-keychain",
            '--disable-background-timer-throttling',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--disable-background-networking',
            '--disable-sync',
            '--metrics-recording-only',
            '--disable-default-apps',
            '--mute-audio',
            '--minimal',
            //`--browser-test`,
            '--disable-backgrounding-occluded-windows',
            // on macOS, disable-background-timer-throttling is not enough
            // and we need disable-renderer-backgrounding too
            // see https://github.com/karma-runner/karma-chrome-launcher/issues/123
            '--disable-renderer-backgrounding',
            '--disable-background-timer-throttling',
            '--disable-device-discovery-notifications',
            '--force-fieldtrials=*BackgroundTracing/default/',
            `--enable-logging=stderr`,
            "--remote-debugging-port=9222",
            (globals.flags.USE_HEADLESS_BROWSER) ? `--headless` : "",
            //'--enable-kiosk-mode',
            `https://localhost:${port}/`
        ],
        { detached: true, stdio: ['ignore', 'ignore', 'ignore'], env: process.env }
    );

    browser.on('close', (code) => {
        Logger
            .get("cure")
            .get("browser")
            .get("chrome")
            .debug(`child process exited with code ${code}`);
    });

    process.on("exit", () => {
        if (!browser.killed)
            browser.kill("SIGTERM");
    });

    process.on("SIGINT", () => {
        if (!browser.killed)
            browser.kill("SIGTERM");
        return false;
    });

    return () => {
        browser.kill("SIGTERM");
    };
}
