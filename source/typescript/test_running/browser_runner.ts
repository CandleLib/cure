import lantern, { $404_dispatch, candlefw_dispatch } from "@candlefw/lantern";
import spark from "@candlefw/spark";

import { spawn } from "child_process";

import path from "path";

import { Globals } from "../types/globals.js";
import { TestResult } from "../types/test_result";
import { TestRig } from "../types/test_rig.js";

let SERVER_LOADED = false, server_test_rigs: TestRig[] = [], server_test_results: TestResult[] = [], active_tests: Set<number> = null, to_complete: number = 0;
export async function prepareTestServer(globals: Globals, test_rigs: TestRig[], test_result: TestResult[]) {

    server_test_rigs = test_rigs;
    server_test_results = test_result;
    active_tests = new Set();
    to_complete = server_test_rigs.length;


    if (SERVER_LOADED)
        return;
    const port = 8083;
    SERVER_LOADED = true;

    /**
     * `@candlefw/test/source/browser/`
     */
    const resource_directory = globals.test_dir + "source/browser/";

    const server = await lantern({
        port,
        host: "127.0.0.1",
        secure: {
            cert: `-----BEGIN CERTIFICATE-----
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
BLQoERL5zutbA/Rlo5lGNMqwTrpr
-----END CERTIFICATE-----
    `,
            key: `-----BEGIN PRIVATE KEY-----
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
TSKhuOYqJrcSAT0LeesBeXeG5O1dcFY=
-----END PRIVATE KEY-----
`
        }
    },
        { log: (..._) => { }, error: (..._) => { }, }
    );

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

                const rig_results: { test_id: number, result: TestResult; } = await tools.getJSONasObject();

                if (rig_results) {

                    const { result, test_id } = rig_results;

                    server_test_rigs[test_id] = null;

                    active_tests.delete(test_id);

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
                console.log(globals.test_dir + "source/browser/index.html");
                return tools.sendRawStreamFromFile(resource_directory + "/index.html");
            },
            keys: { ext: server.ext.all, dir: "/*" }
        },
        $404_dispatch
    );

    //start a dedicated instance of a browser
    await spark.sleep(100);


    startFirefox(port);
    //startChrome(port);
}

function startFirefox(port) {
    const browser = spawn("firefox",
        [
            //  `-headless`,
            '-new-instance',
            `https://localhost:${port}/`
        ],
        { detached: true, stdio: ['ignore', process.stdout, process.stderr], env: process.env }
    );

    browser.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });

    process.on("SIGTERM", () => {
        console.log("AAAAAAAAAAAAAAAAAAAAAAA");
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA");
        browser.kill("SIGKILL");
        //browser.kill();
        return false;
    });

    process.on("exit", () => {
        browser.kill("SIGTERM");
    });
}


function startChrome(port) {
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
            '--disable-backgrounding-occluded-windows',
            // on macOS, disable-background-timer-throttling is not enough
            // and we need disable-renderer-backgrounding too
            // see https://github.com/karma-runner/karma-chrome-launcher/issues/123
            '--disable-renderer-backgrounding',
            '--disable-background-timer-throttling',
            '--disable-device-discovery-notifications',
            '--force-fieldtrials=*BackgroundTracing/default/',
            `--enable-logging=stderr`,
            //`--headless`,
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

        console.log("AAAAAAAAAAAAAAAAAAAAAAA");
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA");
        //browser.kill("SIGKILL");
        process.kill(browser.pid);
        process.exit(0);
        return false;
    });
}
