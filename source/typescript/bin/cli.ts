#!/usr/bin/env node

import { getPackageJsonObject, getProcessArgs, xtF, xtColor, xtReset, col_x11, xtBold } from "@candlefw/wax";

import { createTestFrame, NullReporter, BasicReporter } from "../test.js";
import { instrument } from "../utilities/instrument.js";
import URL from "@candlefw/url";
import fs from "fs";

import node_path from "path";
import { CIReporter } from "../reporting/ci_reporter.js";
const fsp = fs.promises;


let sym_version = "";

const

    warning = xtF(xtColor(col_x11.Red), xtBold),

    reset = xtF(xtReset),

    args = getProcessArgs({
        reporter: true,
        input: true,
        i: "input",
        watch: false,
        w: "watch",
        help: false,
        h: "help",
        output: false,
        o: "output",
        threads: true,
        t: "threads",
        f: false,
        force: "f",
        value: "",
        headless: false,
        "?": false
    }),

    number_of_workers = args.threads ? parseInt(<string>args.threads.val) : 1,

    USE_HEADLESS = !!(args.headless),

    WATCH = !!(args.w),

    OUTPUT = !!(args.o),

    FORCE = !!(args.f),

    INSTRUMENT = (
        args.__array__[0]
        &&
        args.__array__[0][0].toLowerCase() == "instrument"
    ),
    TL = `Delightfully Brilliant Testing.`,

    report = (args?.reporter?.val ?? "basic"),

    INSTRUMENT_HELP_MASSAGE = `

Candlefw Test ${sym_version} - ${xtF(xtColor(col_x11.Khaki1)) + TL + xtF(xtReset)}

Instrumenting

    cfw.test instrument [Options]

Builds test file from package.json data

    [Options]

        Show help message: --help | -h | ?  
        
            Display this help message and exit. 
            Overrides other options.

        Force: -f 

            Setting the force option will overwrite the spec file
            and package.json test scripts settings if they have 
            been set.
    `,

    HELP_MESSAGE = ` 
Candlefw Test ${sym_version} - ${xtF(xtColor(col_x11.Khaki1)) + TL + xtF(xtReset)} 

    cfw.test [Command?] [Options] [...Input_Files]

[Command]
    
    instrument - Builds test file from package.json data.

[Input Files]:
    
    A space delimited list of suite file globs. 

[Options]: 

    Show help message: --help | -h | ?  
        
        Display this help message and exit. 
        Overrides other options.

    Output Result: -o   
        
        Forces the use of a null reporter and returns the test results
        as a JSON string.

    Number of Worker Threads: --threads <count>  
        
        Number of workers threads to use to run tests concurrently.
        Default is 1 thread.

    Headless Browser Testing: --headless
        
        Run browser tests in headless mode.

    Reporter: --reporter = basic | null | ci 
        
        Change the reporter type

        [basic] : Reporter that provides detailed test information
                  during and after tests are run.

        [ci] : Same output as basic reporter, except it does not output
               intermediate results.
    
        [null] : Reporter that does not output any information.

    Watch Input Files:  -w
        
        Monitor suite files for changes. Reruns tests defined
        in the suite file that has been changed. Also watches 
        files of resources imported from relative URIs.
        
        e.g.: 
            import { imports } from "./my_imports"
            import { other_imports } from "../other_imports"
            
        DOES NOT watch files that are imported from node_modules
        or absolute directories:
        
        e.g.:
            import fs from "fs"
            import { module } from "/my_module"
            import { other_module } from "npm_module"

README: https://github.com/CandleFW/test/blob/master/readme.md
`;

let files: string[] = args.trailing_arguments || [];

const HELP = !!(args.help || args["?"]) || files.length == 0;

async function start() {
    await URL.server();

    const { package: pkg, FOUND, package_dir } = await getPackageJsonObject(URL.getEXEURL(import.meta).path);

    sym_version = pkg.version;

    process.title = "cfw.test";

    const legit_log = console.log;

    /**
     * Instrumenting reads the project.json file, and uses it to prepare a test suite file.
     * 
     * This process includes the following steps, in no particular order:
     * - Get the name of the project and use it to name the spec file. 
     * - Get the main entry point and read its exports to add to the spec file.
     * - Create a test folder (if one is not present) and create test spec file. 
     * - Add a script entry in the package.json for testing with cfw.test 
     * (Fatally Warn about overwriting existing scripts)
     */

    if (INSTRUMENT) {

        if (HELP) return void legit_log(INSTRUMENT_HELP_MASSAGE);

        legit_log("Instrumenting");

        await instrument(process.cwd(), FORCE);

    } else {

        if (files.length == 0) legit_log(warning + "NO SUITE FILES FOUND" + reset);

        if (HELP || files.length == 0) return void legit_log(HELP_MESSAGE);

        if (OUTPUT) {

            const frame = createTestFrame({ BROWSER_HEADLESS: USE_HEADLESS, WATCH: false, number_of_workers, test_dir: "" }, ...files);

            frame.setReporter(new NullReporter());

            frame.start().then(d => {
                process.exit(d.FAILED ? 255 : 0);
            });
        } else {

            files = await getSpecFileNames(...files.map(s => {
                let url = new URL(s);

                if (url.IS_RELATIVE)
                    url = URL.resolveRelative(url, process.cwd() + "/");

                return url.path;
            }));

            const frame = createTestFrame({ BROWSER_HEADLESS: USE_HEADLESS, WATCH, number_of_workers, test_dir: package_dir }, ...files);

            switch (report) {
                case "null":
                    frame.setReporter(new NullReporter); break;
                case "ci":
                    frame.setReporter(new CIReporter); break;
                case "basic":
                default:
                    frame.setReporter(new BasicReporter); break;
            }

            await frame.start().then(d => {

                if (d.errors)
                    d.errors.forEach(console.error);

                process.exit(d.FAILED ? 1 : 0);
            });
        }
    }
}

export async function getSpecFileNames(...files: string[]): Promise<string[]> {

    //recursively load data from all sub-folders

    const pending = files
        .filter(f => !(new URL(f)).ext)
        .map(f => ({
            dir_type: "directory",
            path: f
        })),
        strings: string[] = files
            .filter(f => !!(new URL(f)).ext && f.includes(".spec.js"));


    for (let i = 0; i < pending.length; i++) {
        const { dir_type, path } = pending[i];

        if (dir_type == "directory") {

            for (const candidate of await fsp.readdir(path, { withFileTypes: true })) {

                const new_path = node_path.join(path, "/", candidate.name);

                if (candidate.isDirectory())
                    pending.push({ dir_type: "directory", path: new_path });

                else if (candidate.isFile())
                    pending.push({ dir_type: "file", path: new_path });
            }

        } else {
            if (path.includes(".spec.js"))
                strings.push(path);
        }
    }

    return strings;
}


start();


