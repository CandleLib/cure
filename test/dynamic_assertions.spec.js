import URL from "@candlefw/url";
import { createTestRigsFromStringSource } from "./tools.js";

await URL.server();

const rigs = createTestRigsFromStringSource(await (URL.resolveRelative("./data/dynamic_test.js")).fetchText());

assert(rigs !== undefined);
assert(rigs.length == 1);