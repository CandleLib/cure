import lantern, { $404_dispatch, candlefw_dispatch } from "@candlefw/lantern";
import spark from "@candlefw/spark";

import { spawn } from "child_process";

import path from "path";
import { Globals } from "../../types/globals.js";
import { Test } from "../../types/test.js";
import { TestInfo } from "../../types/test_info.js";
import { TestRunner } from "../../types/test_runner.js";

let SERVER_LOADED = false, server_test_rigs: Test[] = [], server_test_results: TestInfo[] = [], active_tests: Set<number> = null, to_complete: number = 0;

export class BrowserRunner implements TestRunner {

}

export async function prepareTestServer(globals: Globals, test_rigs: Test[], test_result: TestInfo[]) {

    server_test_rigs = test_rigs;
    server_test_results = test_result;
    active_tests = new Set();
    to_complete = server_test_rigs.length;


    if (SERVER_LOADED)
        return;

    const port = await lantern.getUnusedPort();

    SERVER_LOADED = true;

    /**
     * `@candlefw/test/source/browser/`
     */
    const resource_directory = globals.test_dir + "source/browser/";

    const server = await lantern({
        type: "http2",
        port,
        host: "0.0.0.0",
        secure: lantern.mock_certificate,
        log: lantern.null_logger
    });

    server.addDispatch(
        {
            name: "REDIRECT_TO_SLASH_TERMINATED_PATH",
            description: "Redirect directory requests to paths that are terminated with a backslash",
            MIME: "text/html",
            respond: async function (tools) {

                if (!tools.url.ext && tools.url.path[tools.url.path.length - 1] !== "/")
                    return tools.redirect(tools.url.path + "/");

                return false;
            },
            keys: { ext: server.ext.all, dir: "/*" }
        },
        {
            name: "RESOLVE_TEST_RIG",
            description: "Browser responding with the results of a test",
            MIME: "application/json",
            respond: async function (tools) {

                const rig_results: { test_id: number, result: TestInfo; } = await tools.getJSONasObject();

                if (rig_results) {

                    const { result, test_id } = rig_results;

                    server_test_rigs[test_id] = null;

                    active_tests.delete(test_id);

                    //convert any errors into local test errors
                    result.errors = result.errors.map(e => (new TestError(Object.assign(new Error, e))));

                    server_test_results.push(result);

                    return tools.sendUTF8String(JSON.stringify({ "completed": (--to_complete) == 0 }));
                }

                return tools.sendUTF8String(JSON.stringify({ "completed": "false" }));
            },
            keys: { ext: server.ext.all, dir: "/test_rigs/resolve/" }
        },
        {
            name: "RETRIEVE_TEST_RIG",
            description: "Browser requesting a new test rig to run",
            MIME: "application/json",
            respond: async function (tools) {

                for (let i = 0; i < server_test_rigs.length; i++) {
                    const test = server_test_rigs[i];

                    if (test && !active_tests.has(i)) {
                        active_tests.add(i);
                        return tools.sendUTF8String(JSON.stringify({ test_id: i, test }));
                    }
                }

                return tools.sendUTF8String(JSON.stringify({ "NO_TESTS": "true" }));

            },
            keys: { ext: server.ext.all, dir: "/test_rigs/acquire/" }
        },
        {
            name: "TEXT_COMPONENTS_INDEX_HTML",
            description: "Loads individual test rig data",
            MIME: "text/html",
            respond: async function (tools) {
                if (tools.ext !== "")
                    return false;
                tools.setMIME();
                return tools.sendRawStreamFromFile(resource_directory + tools.url.path + "index.html");
            },
            keys: { ext: server.ext.all, dir: "/components/*" }
        },
        {
            name: "TEXT_COMPONENTS_INDEX_WICK",
            description: "Loads individual test rig data",
            MIME: "text/html",
            respond: async function (tools) {
                if (tools.ext !== "")
                    return false;
                tools.setMIME();
                return tools.sendRawStreamFromFile(resource_directory + tools.url.path + "index.wick");
            },
            keys: { ext: server.ext.all, dir: "/components/*" }
        },
        {
            name: "NAMED_COMPONENTS",
            description: "Loads individual test rig data",
            MIME: "text/html",
            respond: async function (tools) {
                tools.setMIME();
                return tools.sendRawStreamFromFile(path.join(resource_directory, tools.url.path));
            },
            keys: { ext: server.ext.all, dir: "/components/*" }
        },
        {
            name: "TEST_HARNESS",
            description: "Return test_harness file",
            MIME: "application/javascript",
            respond: async function (tools) {
                tools.setMIME();
                return tools.sendRawStreamFromFile(globals.test_dir + "/build/library/test_running/test_harness.js");
            },
            keys: { ext: server.ext.all, dir: "/test_harness/acquire/" }
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
        {
            name: "TEST_HARNESS",
            description: "Return test_harness file",
            MIME: "application/javascript",
            respond: async function (tools) {
                tools.setMIME();
                return tools.sendRawStreamFromFile(globals.test_dir + "/build/library/test_running/construct_test_function.js");
            },
            keys: { ext: server.ext.all, dir: "/construct_test_function/acquire/" }
        },
        candlefw_dispatch,
        {
            name: "TEST_RIG",
            description: "Loads individual test rig data",
            MIME: "text/html",
            respond: async function (tools) {
                if (tools.filename !== "")
                    return false;
                tools.setMIME();
                return tools.sendRawStreamFromFile(resource_directory + "/index.html");
            },
            keys: { ext: server.ext.all, dir: "/" }
        },
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
        $404_dispatch
    );

    //start a dedicated instance of a browser
    await spark.sleep(100);


    //startFirefox(port, globals);
    startChrome(port, globals);
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
        console.log(`child process exited with code ${code}`);
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


function startChrome(port, globals: Globals) {
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
        { detached: false, stdio: ['ignore', process.stdout, process.stderr], env: process.env }
    );

    browser.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });


    process.on("exit", () => {
        browser.kill("SIGTERM");
    });

    process.on("SIGINT", () => {
        browser.kill("SIGTERM");
        //process.kill(browser.pid);
        process.exit(0);
        return false;
    });
}
