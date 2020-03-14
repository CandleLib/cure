#!/usr/bin/env node

import { test } from "../build/library/test.js";
import { getProcessArgs, xtF, color, xtColor, xtReset } from "@candlefw/wax";

const warning = xtF(xtColor(color.red)),
    reset = xtF(xtReset);


const
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

    Watch input files:  --watch | -w
        
        Monitor suite files for changes. Reruns tests defined
        in the suite file that has been changed. Also watches 
        files of resources imported from relative URIs.
        
        i.e.: 
            import { imports } from "./my_imports"
            import { other_imports } from "../other_imports"

        Will not watch files that are imported from node_modules
        or absolute directories:
        
        i.e.:
            import fs from "fs"
            import { module } from "/my_module"
            import { other_module } from "npm_module"

README: https://www.github.com/candlefw/test/
`;

process.title = "cfw.test";

if (HELP) {
    if (files.length == 0)
        console.log(warning + "NO SUITE FILES FOUND" + reset);
    console.log(HELP_MESSAGE);
}
else
    test(WATCH, ...files);
