/**[API]:testing
 * 
 * Should compile test_rigs as a group in 
 * SEQUENCE : { ... } labeled blocks;
 */

import URL from "@candlelib/uri";
import { createTestsFromStringSource } from "./tools.js";

const source = await (URL.resolveRelative("./test/data/sequence_test_spec.js")).fetchText();
const result = createTestsFromStringSource(source);

assert(result.length == 1);
