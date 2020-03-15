#!/usr/bin/env node

import { getProcessArgs, xtF, color, xtColor, xtReset } from "@candlefw/wax";

import { test } from "../build/library/main.js";

const
    warning = xtF(xtColor(color.red)),
    reset = xtF(xtReset),
    args = getProcessArgs(),
    files = args.__array__.filter(a => a.hyphens == 0).map(a => a.name),
    WATCH = !!(args.watch || args.w),
    HELP = !!(args.help || args.h || args["?"]) || files.length == 0,

    HELP_MESSAGE = ` 
Candlefw Test

    cfw_test [Options] [...Input_Files]

[Input Files]:
    
    A space delimited list of suite file globs. 

[Options]: 


    Show help message: --help | -h | -?  
        
        Display this help message.

    Output Result: -o   
        
        Forses the use of a null reporter and returns the test results
        as a JSON string.

    Watch input files:  --watch | -w
        
        Monitor suite files for changes. Reruns tests defined
        in the suite file that has been changed. Also watches 
        files of resources imported from relative URIs.
        
        i.e.: 
            import { imports } from "./my_imports"
            import { other_imports } from "../other_imports"
            ;

            const
        Will not watch files that are imported from node_modules
        or absolute directories:
        
        i.e.:
            import fs from "fs"
            import { module } from "/my_module"
            import { other_module } from "npm_module"

README: https://www.github.com/candlefw/test/
`;


async function start() {

    console.log(args)s
    process.title = "cfw.test";

    if (HELP) {
        if (files.length == 0)
            console.log(warning + "NO SUITE FILES FOUND" + reset);

        console.log(HELP_MESSAGE);
    } else {

        const frame = test(WATCH, ...files);

        frame.start().then(d => {

            console.dir(d, { depth: null })

            process.exit(d.FAILED ? 255 : 0);
        });
    }
}

start();


