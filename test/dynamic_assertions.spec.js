import URL from "@candlefw/url";
import { createTestRigsFromStringSource, createTestSuiteFromSource, getSuiteTestOutcomeFromSource } from "./tools.js";

await URL.server();

const source = await (URL.resolveRelative("./data/dynamic_test.js")).fetchText();

const raw_rigs = createTestRigsFromStringSource(source);

assert("Rigs object is not undefined", raw_rigs !== undefined);
assert("One RawTestRig object created", raw_rigs.length == 1);
assert("No import names", raw_rigs[0].import_names.size == 0);

//Run the test
const suite = await createTestSuiteFromSource(source);
assert(suite != null);
assert(suite.error == null);
assert(suite.rigs.length == 1);

const outcome = await getSuiteTestOutcomeFromSource(source);

assert(outcome != null);
assert(outcome.FAILED == true);
assert(outcome.results.length == 10);