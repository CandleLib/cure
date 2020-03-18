#!/usr/bin/env node

import { getProcessArgs, xtF, xtColor, xtReset, col_x11, xtBold } from "@candlefw/wax";

import { createTestFrame, NullReporter } from "../build/library/main.js";

const
    warning = xtF(xtColor(col_x11.Red), xtBold),
    reset = xtF(xtReset),
    args = getProcessArgs(),
    files = args.__array__.filter(a => a.hyphens == 0).map(a => a.name),
    WATCH = !!(args.w),
    HELP = !!(args.help || args.h || args["?"]) || files.length == 0,
    OUTPUT = !!(args.o),

    HELP_MESSAGE = ` 
Candlefw Test

    cfw_test [Options] [...Input_Files]

[Input Files]:
    
    A space delimited list of suite file globs. 

[Options]: 


    Show help message: --help | -h | -?  
        
        Display this help message.

    Output Result: -o   
        
        Forces the use of a null reporter and returns the test results
        as a JSON string.

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

    if (HELP) {
        if (files.length == 0)
            console.log(warning + "NO SUITE FILES FOUND" + reset);

        console.log(HELP_MESSAGE);
    } else {

        if (OUTPUT) {

            const frame = createTestFrame(false, ...files);

            frame.setReporter(new NullReporter());

            frame.start().then(d => {

                console.log(JSON.stringify(d));

                process.exit(d.FAILED ? 255 : 0);
            });
        } else {

            const frame = createTestFrame(WATCH, ...files);


            await frame.start().then(d => {

                if (d.error)
                    console.error(d);

                process.exit(d.FAILED ? 255 : 0);
            });
        }
    }
}

start();


