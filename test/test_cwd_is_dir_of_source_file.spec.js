/**[API]:testing
 * 
 * Using @candlelib/url,  when a test rig is run the dir ( URL.GLOBAL )
 * should be the same as the test's source file's dir.
 */


import { getPackageJsonObject } from "@candlelib/wax";
import URL from "@candlelib/url";

const
    { package_dir, FOUND, package: pkg } = await getPackageJsonObject(URL.getCWDURL() + "/"),
    expected_dir = URL.resolveRelative("./test/", package_dir).path;

assert(FOUND == true);
assert(pkg?.name == "@candlelib/test");
assert(expected_dir == URL.GLOBAL + "");