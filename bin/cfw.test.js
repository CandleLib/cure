#!/usr/bin/env node

import { getProcessArgs, xtF, xtColor, xtReset, col_x11, xtBold } from "@candlefw/wax";

import { createTestFrame, NullReporter } from "../build/library/main.js";
import { instrument } from "../build/library/utilities/instrument.js";
import { sym_version } from "../build/library/utilities/sym_version.js";


const
    warning = xtF(xtColor(col_x11.Red), xtBold),
    reset = xtF(xtReset),
    args = getProcessArgs(),
    files = args.__array__.filter(a => a.hyphens == 0).map(a => a.name),
    number_of_workers = args.threads ? parseInt(args.threads.value) : 1,
    WATCH = !!(args.w),
    HELP = !!(args.help || args.h || args["?"]) || files.length == 0,
    OUTPUT = !!(args.o),
    FORCE = !!(args.f),
    INSTRUMENT = (
        args.__array__[0]
        &&
        args.__array__[0].name.toLowerCase() == "instrument"
    ),
    TL = `Delightfully Brilliant Testing.`,
    INSTRUMENT_HELP_MASSAGE = `

Candlefw Test ${sym_version} - ${xtF(xtColor(col_x11.Khaki1)) + TL + xtF(xtReset)}

Instrumenting

    cfw.test instrument [Options]

Builds test file from package.json data

    [Options]

        Show help message: -h | -?  
        
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


    Show help message: -h | -?  
        
        Display this help message and exit. 
        Overrides other options.

    Output Result: -o   
        
        Forces the use of a null reporter and returns the test results
        as a JSON string.

    Number of Worker Threads: --threads <count>  
        
        Number of workers threads to use to run tests concurrently.
        Minimum is 1 thread,

    Watch Input Files:  -w
        
        Monitor suite files for changes. Reruns tests defined
        in the suite file that has been changed. Also watches 
        files of resources imported from relative URIs.
        
        i.e.: 
            import { imports } from "./my_imports"
            import { other_imports } from "../other_imports"
            
        DOES NOT watch files that are imported from node_modules
        or absolute directories:
        
        i.e.:
            import fs from "fs"
            import { module } from "/my_module"
            import { other_module } from "npm_module"

README: https://github.com/CandleFW/test/blob/master/readme.md
`;

async function start() {

    process.title = "cfw.test";

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

        if (HELP) return void console.log(INSTRUMENT_HELP_MASSAGE);

        console.log("Instrumenting");

        await instrument(process.cwd(), FORCE);

    } else {

        if (files.length == 0) console.log(warning + "NO SUITE FILES FOUND" + reset);

        if (HELP || files.length == 0) return void console.log(HELP_MESSAGE);

        if (OUTPUT) {

            const frame = createTestFrame({ WATCH: false, number_of_workers }, ...files);

            frame.setReporter(new NullReporter());

            frame.start().then(d => {

                console.log(JSON.stringify(d));

                process.exit(d.FAILED ? 255 : 0);
            });
        } else {

            const frame = createTestFrame({ WATCH, number_of_workers }, ...files);

            await frame.start().then(d => {

                if (d.error)
                    console.error(d);

                process.exit(d.FAILED ? 255 : 0);
            });
        }
    }
}

start();


