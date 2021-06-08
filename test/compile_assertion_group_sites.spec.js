/**[API]:testing
 * 
 * Should compile test_rigs as a group in 
 * SEQUENCE : { ... } labeled blocks;
 */

import { parser } from "@candlelib/js";
import { compileTestsFromSourceAST } from "@candlelib/cure/build/library/compile/compile_statements.js";
import URL from "@candlelib/uri";
import { createGlobalsObject } from "./tools.js";

const source = await (URL.resolveRelative("./test/data/function_test_spec.js")).fetchText();
const globals = createGlobalsObject();
const { assertion_sites } = compileTestsFromSourceAST(globals, parser(source).ast, []);

assert(assertion_sites.length == 5);
assert("'Group Name' test 1 name Matches", assertion_sites[0].static_name == "Group Name-->2==1");
assert("'Group Name' test 2 name Matches", assertion_sites[1].static_name == "Group Name-->2>2");
assert("Has [d] Import requirement", assertion_sites[2].import_names.has("d") == true);
assert("Has [exp] Import requirement", assertion_sites[2].import_names.has("exp") == true);

assert("[REMOVED] Assertion Site `type` no longer present", assertion_sites[2].type == undefined);
assert("[REMOVED]'Group Name:Group Name 2' test 1 name Matches", assertion_sites[2].test_maps == undefined);
assert("[REMOVED]'Group Name:Group Name 2' test 2 name Matches", assertion_sites[2].test_maps == undefined);

assert(assertion_sites[3].import_names.has("exp") == false);
assert(assertion_sites[3].static_name == "test 3");
assert(assertion_sites[4].static_name == "a==4");


assert("Assertion 3 site has a browser requirement", assertion_sites[2].BROWSER == true);
assert("Assertion 4 site has a browser requirement", assertion_sites[3].BROWSER == true);