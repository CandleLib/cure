/**[API]:testing
 * 
 * A Compile Statements function should build test rigs from a 
 * source file. Each test rig SHOULD represent all necessary 
 * statements required to correctly assess the expression 
 * within the assertion site. Spurious statements MAY be 
 * included, but statements that have an effect on the result 
 * of the assertion expression MUST be included. 
 * 
 * There should be a unique test rig for each assertion site,
 * EXCEPT in the event the assertion site is part of a sequence
 * of assertion calls that MUST be run in order. This determination
 * is left to the user.
 * 
 * Any import requirement of an assertion site expression or it's
 * proceeding statements must be present within the test rig 
 * ImportSources.
 */


import { compileRawTestRigs } from "@candlefw/test/build/library/compile/compile_statements.js";
import { InitializeReporterColors } from "@candlefw/test/build/library/utilities/create_test_frame.js";

import URL from "@candlefw/url";
import { parser, renderWithFormatting } from "@candlefw/js";
import { BasicReporter } from "@candlefw/test";

const reporter = new BasicReporter;

InitializeReporterColors(reporter);

//*
const source = await(URL.resolveRelative("./data/standard_test_spec.js")).fetchText();


const { raw_rigs: rigs } = compileRawTestRigs(parser(source).ast, reporter, []);

// compileStatementsNew expects a global object and  
assert(rigs.length == 11);

//assert(renderWithFormatting(rigs[0].ast) == 0, only);

assert(rigs[0].ast.nodes.length == 5);
assert(rigs[1].ast.nodes.length == 6);
assert(rigs[2].ast.nodes.length == 5);
assert(rigs[3].ast.nodes.length == 6);
assert(rigs[4].ast.nodes.length == 7);
assert(rigs[5].ast.nodes.length == 7);
assert(rigs[6].ast.nodes.length == 5);
assert(rigs[7].ast.nodes.length == 5);
assert(rigs[8].ast.nodes.length == 5);
assert(rigs[9].ast.nodes.length == 5);
assert(rigs[10].ast.nodes.length == 6);

assert(rigs[0].name == "0 Basic built in assertion should pass");
assert(rigs[1].name == "1 Basic built in assertion");
assert(rigs[2].name == "2 Chai assert test 1 - Undeclared variable error");
assert(rigs[3].name == "3 Chai assert test 2");
assert(rigs[4].name == "4 Chai assert test 3");
assert(rigs[5].name == "5 Chai assert test 4");
assert(rigs[6].name == "6 Report undeterminable test");
assert(rigs[7].name == "7 Basic failed inequality");
assert(rigs[8].name == "8 Failed strict equality");
assert(rigs[9].name == "9 Passing equality");
assert(rigs[10].name == "10 The NullReport update method should return true");

//*/
//*
const source2 = await(URL.resolveRelative("./data/nested_dependencies_test_spec.js")).fetchText();
const { raw_rigs: nested_rigs } = compileRawTestRigs(parser(source2).ast, reporter, []);
"Nested global dependencies are located";
assert(nested_rigs[0].import_names.size == 8);
"Nested global dependencies are present in the import_names property";
assert([...nested_rigs[0].import_names.values()].sort() == ['A', 'A1', 'A2', 'B', 'D', 'R', 'ext_map', 'log']);
//*/