import URL from "@candlelib/uri";
import { assert } from "console";
import { createTestsFromStringSource, createTestSuiteFromSource, getSuiteTestOutcomeFromSource } from "./tools.js";

await URL.server();

const source = await (URL.resolveRelative("./test/data/dynamic_test.js")).fetchText();
const assertion_sites = createTestsFromStringSource(source);

assert("Rigs object is not undefined", assertion_sites !== undefined);
assert("One RawTestRig object created", assertion_sites.length == 8);
assert("No import names", assertion_sites[0].import_names.size == 0);

//Run the test
const suite = await createTestSuiteFromSource(source);

assert(suite != null);
assert(suite.error == null);
assert(suite.tests.length == 8);

const outcome = await getSuiteTestOutcomeFromSource(source);

assert(outcome.FAILED == true);
assert("32 Test Results have been dynamically generated", outcome.results.length == 32);
assert("32 Test Names have been dynamically generated", outcome.results.map(r => r.name) == [
    "While A0", "While A1", "While A2", "While A3",
    "While B0", "While B1", "While B2", "While B3",
    "For(;;) A0", "For(;;) A1", "For(;;) A2", "For(;;) A3",
    "For(;;) B0", "For(;;) B1", "For(;;) B2", "For(;;) B3",
    "For of A0", "For of A1", "For of A2", "For of A3",
    "For of B0", "For of B1", "For of B2", "For of B3",
    "Do While A0", "Do While A1", "Do While A2", "Do While A3",
    "Do While B0", "Do While B1", "Do While B2", "Do While B3",
]);