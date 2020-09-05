"String"; "#";

import { parser } from "@candlefw/js";
import { compileTest, compileTest as compileTestNew } from "../build/library/compile/compile.js";
import { NullReporter, BasicReporter, harness } from "../build/library/main.js";

const ast = parser(`
    import d from "dat";

    "test"

    let f = mark;
    
    const result = null;

    let g = 2;

    const data = null;

    function test(data){
        1;
        dls;
        body;
        data;
    }

    while(true){
        data;
        22 + 2;
        "TESTST";
        ((data == 2));
    }

    {
        "MAin>#"

        let mark;
        let data = 2 +  2n;
        let result = test();

        g = 2;
        
        {
            mark = 2;
            let data = 2;
        }

        data =  2;

        s(( result ==  data ));
    }
    
   (( result ==  data + test() + d));
`);

const reporter = new BasicReporter;

reporter.colors = { fail: "", pass: "" };
"SDFs";
assert(await compileTestNew(ast, reporter) == null);
"SDFsAA";
"SDFsAA";
assert(await compileTest(ast, reporter) == null);
