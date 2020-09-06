/**[API]:testing
 * 
 * Should compile test_rigs as a group in 
 * SEQUENCE : { ... } labeled blocks;
 */


import { compileRawTestRigs } from "@candlefw/test/build/library/compile/compile_statements_new.js";
import { InitializeReporterColors } from "@candlefw/test/build/library/utilities/create_test_frame.js";

import URL from "@candlefw/url";

import { parser, renderWithFormatting } from "@candlefw/js";

import { BasicReporter } from "@candlefw/test";

const source = await(URL.resolveRelative("./data/sequence_test_spec.js")).fetchText(),
    imports = [],
    tests = [],
    reporter = new BasicReporter;

InitializeReporterColors(reporter);

const rigs = compileRawTestRigs(parser(source).ast, reporter, imports);

// compileStatementsNew expects a global object and  
assert(rigs.length == 1);
assert(rigs[0].rig.test_maps.length == 11);
