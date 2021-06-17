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


import URL from "@candlelib/uri";
import { createTestsFromStringSource } from "./tools.js";


//*
const source = await (URL.resolveRelative("./test/data/advance_sequence_spec.js")).fetchText();

const assertion_sites = createTestsFromStringSource(source);

// compileStatementsNew expects a global object and  
assert(assertion_sites.length == 1);
assert(assertion_sites[0].SOLO == true);

// Test Sequence Directly

assert_group(sequence, "These Sequenced Tests Should Pass", () => {
    var name = "ABE";
    assert(name(name), 1 == 1);
    name = "ABED";
    assert(name(name), 2 == 2);
    name = "ABER";
    assert(name(name), 3 == 3);
});

