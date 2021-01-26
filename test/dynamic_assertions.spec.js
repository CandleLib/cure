import URL from "@candlefw/url";
import { createTestRigsFromStringSource } from "./tools.js";

await URL.server();

const { raw_rigs: rigs } = createTestRigsFromStringSource(await (URL.resolveRelative("./data/dynamic_test.js")).fetchText());

assert(rigs.length == 1);

