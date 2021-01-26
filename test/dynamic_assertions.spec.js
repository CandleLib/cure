import URL from "@candlefw/url";
import { createTestRigsFromStringSource } from "./tools.js";

await URL.server();

const rigs = createTestRigsFromStringSource(await (URL.resolveRelative("./data/dynamic_test.js")).fetchText());

assert("Rigs object is not undefined", rigs !== undefined);
assert("One RawTestRig object created", rigs.length == 1);
assert("No Import Names", rigs[0].import_names.size == 0);