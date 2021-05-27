import { parser, renderWithFormatting } from "@candlelib/js";
import { assert } from "console";
import { compileTests } from "../build/library/compile/compile.js";
import { createGlobalsObject } from "./tools.js";



const source = `var i = 0;
var i = 0;
for(var i = 0; ;){

    assert(i==2)
}

`;
const { ast } = parser(source);

assert(skip, ast.pos !== undefined);

const expected_result = `
        
    for(let i= 0;i<8;i++){

        

            $$.pushTestResult(0);

            $$.setResultName("i==3");

            $$.pushValue("i");

            $$.pushValue(i);

            $$.pushValue("3");

            $$.pushValue(3);

            $$.pushValue('==');

            $$.pushValue($$.equal($$.getValue(3), $$.getValue(1)));

            $$.pushAndAssertValue($$.getValue(5));

            $$.popTestResult();
        
    }
`;


const globals = createGlobalsObject();
const { assertion_sites } = compileTests(ast, globals, "./compile.spec.js");
const { ast: site_ast } = assertion_sites[0];
const source_string = renderWithFormatting(site_ast);

assert(skip, "Should work", source_string == expected_result);