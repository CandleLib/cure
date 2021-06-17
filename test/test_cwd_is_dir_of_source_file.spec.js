/**[API]:testing
 * 
 * Using @candlelib/uri,  when a test rig is run the dir ( URL.GLOBAL )
 * should be the same as the test's source file's dir.
 */


import { getPackageJsonObject } from "@candlelib/paraffin";
import URL from "@candlelib/uri";

const
    { package_dir, FOUND, package: pkg } = await getPackageJsonObject(URL.getCWDURL() + "/"),
    expected_dir = URL.resolveRelative("./test/", package_dir).path;

assert(FOUND == true);
assert(pkg?.name == "@candlelib/cure");

// Not sure if this should be implemented. Could break a bunch
// Of existing tests that rely on CWD being the root of the package
//assert(i, expected_dir == URL.GLOBAL + "");