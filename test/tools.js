import URL from "@candlefw/url";
import { compileRawTestRigs } from "@candlefw/test/build/library/compile/compile_statements.js";
import { InitializeReporterColors } from "@candlefw/test/build/library/utilities/create_test_frame.js";
import { parser } from "@candlefw/js";
import { BasicReporter } from "@candlefw/test";
const reporter = new BasicReporter;
InitializeReporterColors(reporter);

await URL.server();

export function createTestRigsFromStringSource(source) {

    const { raw_rigs: rigs } = compileRawTestRigs(parser(source).ast, reporter, []);

    return rigs;
}