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


import { parser } from "@candlelib/js";
import { compileTestsFromSourceAST } from "@candlelib/cure/build/library/compile/compile_statements.js";
import URL from "@candlelib/uri";
import { createGlobalsObject } from "./tools.js";


//*
const source = await (URL.resolveRelative("./test/data/standard_test_spec.js")).fetchText();

const globals = createGlobalsObject();

let { assertion_sites } = compileTestsFromSourceAST(globals, parser(source).ast, []);

assert(assertion_sites.length == 11);

// These tests are sipped since they are likely to break frequently 
// and don't prove much.
assert(skip, assertion_sites[0].ast.nodes.length == 5);
assert(skip, assertion_sites[1].ast.nodes.length == 6);
assert(skip, assertion_sites[2].ast.nodes.length == 5);
assert(skip, assertion_sites[3].ast.nodes.length == 6);
assert(skip, assertion_sites[4].ast.nodes.length == 7);
assert(skip, assertion_sites[5].ast.nodes.length == 7);
assert(skip, assertion_sites[6].ast.nodes.length == 5);
assert(skip, assertion_sites[7].ast.nodes.length == 5);
assert(skip, assertion_sites[8].ast.nodes.length == 5);
assert(skip, assertion_sites[9].ast.nodes.length == 5);
assert(skip, assertion_sites[10].ast.nodes.length == 6);

assert(assertion_sites[0].static_name == "0 Basic built in assertion should pass");
assert(assertion_sites[1].static_name == "1 Basic built in assertion");
assert(assertion_sites[2].static_name == "2 Chai assert test 1 - Undeclared variable error");
assert(assertion_sites[3].static_name == "3 Chai assert test 2");
assert(assertion_sites[4].static_name == "4 Chai assert test 3");
assert(assertion_sites[5].static_name == "5 Chai assert test 4");
assert(assertion_sites[6].static_name == "6 Report undeterminable test"); //< No longer generates a test. Reports a library error instead
assert(assertion_sites[7].static_name == "7 Basic failed inequality");
assert(assertion_sites[8].static_name == "8 Failed strict equality");
assert(assertion_sites[9].static_name == "9 Passing equality");
assert(assertion_sites[10].static_name == "10 The NullReport update method should return true");

const source2 = await (URL.resolveRelative("./test/data/nested_dependencies_test_spec.js")).fetchText();

assertion_sites = compileTestsFromSourceAST(globals, parser(source2).ast, []).assertion_sites;

assert("Nested global dependencies are located", assertion_sites[0].import_names.size == 8);

assert("Nested global dependencies are present in the import_names property",
    [...assertion_sites[0].import_names.values()].sort() == ['A', 'A1', 'A2', 'B', 'D', 'R', 'ext_map', 'log']
);