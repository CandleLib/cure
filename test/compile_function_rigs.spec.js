/**[API]:testing
 * 
 * Should compile test_rigs as a group in 
 * SEQUENCE : { ... } labeled blocks;
 */

import { compileRawTestRigs } from "@candlefw/test/build/library/compile/compile_statements.js";
import { InitializeReporterColors } from "@candlefw/test/build/library/utilities/create_test_frame.js";

import URL from "@candlefw/url";

import { parser, renderCompressed } from "@candlefw/js";

import { BasicReporter } from "@candlefw/test";

const source = await(URL.resolveRelative("./data/function_test_spec.js")).fetchText(),
    imports = [],
    reporter = new BasicReporter;

InitializeReporterColors(reporter);

const output = compileRawTestRigs(parser(source).ast, reporter, imports);
const rigs = output.raw_rigs;

//assert(rigs[0], inspect);

// compileStatementsNew expects a global object and  
assert(rigs.length == 5);
assert("'Group Name' test 1 name Matches", rigs[0].name == "Group Name-->2==1");
assert("'Group Name' test 2 name Matches", rigs[1].name == "Group Name-->2>2");

assert(rigs[2].type == "SEQUENCE");
assert(rigs[2].import_names.has("d") == true);
assert(rigs[2].import_names.has("exp") == true);
assert(rigs[2].BROWSER == true);
assert("'Group Name:Group Name 2' test 1 name Matches", rigs[2].test_maps[0].name == "test");
assert("'Group Name:Group Name 2' test 2 name Matches", rigs[2].test_maps[1].name == "3==a");

assert(rigs[3].import_names.has("exp") == false);
assert(rigs[3].BROWSER == true);
assert(rigs[3].name == "test 3");
assert(rigs[4].name == "a==4");

