/**[API]:testing
 * 
 * Should compile test_rigs as a group in 
 * SEQUENCE : { ... } labeled blocks;
 */

import { compileRawTestRigs } from "@candlefw/test/build/library/compile/compile_statements_new.js";
import { InitializeReporterColors } from "@candlefw/test/build/library/utilities/create_test_frame.js";

import URL from "@candlefw/url";

import { parser, renderCompressed } from "@candlefw/js";

import { BasicReporter } from "@candlefw/test";

const source = await(URL.resolveRelative("./data/var_statement_rig.js")).fetchText(),
    imports = [],
    reporter = new BasicReporter;

InitializeReporterColors(reporter);

const output = compileRawTestRigs(parser(source).ast, reporter, imports);
const rigs = output.raw_rigs;

assert(rigs[0].import_names.has("comp") == false);
assert(rigs[0].import_names.has("wick") == true);
