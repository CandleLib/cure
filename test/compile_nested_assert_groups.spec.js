/**[API]:testing
 * 
 * Nested assert groups should work as expected, either labeling containing assertion sites
 * with the assert_group's name, or sequencing ALL assertion_sites into a single, monolithic
 * test if the assert_group has a `sequence` meta label.
 */

import { parser } from "@candlelib/js";
import { compileTestsFromSourceAST } from "../build/library/compile/compile_statements.js";
import URL from "@candlelib/uri";
import { createGlobalsObject } from "./tools.js";

const source = await (URL.resolveRelative("./test/data/nested_assert_groups.js")).fetchText();
const globals = createGlobalsObject();
const { assertion_sites } = compileTestsFromSourceAST(globals, parser(source).ast, []);

assert("Should have 6 assertion sites. 1 sequenced, 4 nested assert_groups, 1 within root assert_group.", assertion_sites.length == 6);
console.log(assertion_sites[0].static_name);
assert("Expected value of assertion site 1 contains [Level 1]", assertion_sites[0].static_name.includes("Level 1") == true);
console.log(assertion_sites[1].static_name);
assert("Expected value of assertion site 2 contains [Level 2]", assertion_sites[1].static_name.includes("Level 2") == true);
console.log(assertion_sites[2].static_name);
assert("Expected value of assertion site 3 contains [Level 3-A]", assertion_sites[2].static_name.includes("Level 3-A") == true);
console.log(assertion_sites[3].static_name);
assert("Expected value of assertion site 4 contains [Level 4-A Sequenced]", assertion_sites[3].static_name.includes("Level 4-A Sequenced") == true);
console.log(assertion_sites[4].static_name);
assert("Expected value of assertion site 5 contains [Level 3-B]", assertion_sites[4].static_name.includes("Level 3-B") == true);
console.log(assertion_sites[5].static_name);
assert("Expected value of assertion site 6 contains [Level 4-B]", assertion_sites[5].static_name.includes("Level 4-B") == true);