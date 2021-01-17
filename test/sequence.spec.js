/**[API]:testing
 * 
 * assert_group specified with an sequence label will run all tests
 * sequentially on one thread. This applies to all assertion sites
 * including those defined in child assert_group containers. 
 * 
 * assert_group can be labeled with solo to force all assertion
 * sites within the group to run at the exclusion of all assertions
 * sites outside the group, unless those sites have also been labeled
 * solo
 */


import { compileRawTestRigs } from "@candlefw/test/build/library/compile/compile_statements.js";
import { InitializeReporterColors } from "@candlefw/test/build/library/utilities/create_test_frame.js";

import URL from "@candlefw/url";
import { parser, renderWithFormatting } from "@candlefw/js";
import { BasicReporter } from "@candlefw/test";

const reporter = new BasicReporter;

InitializeReporterColors(reporter);

//*
const source = await (URL.resolveRelative("./data/advance_sequence_spec.js")).fetchText();

const { raw_rigs: rigs } = compileRawTestRigs(parser(source).ast, reporter, []);

// compileStatementsNew expects a global object and  
assert(rigs[0].test_maps.length == 4);
assert(rigs[0].test_maps[1].SOLO == false);
assert(rigs[0].test_maps[2].SOLO == true);

