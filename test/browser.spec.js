/**[API]:testing
 * 
 * Using @candlefw/url, when a test rig is run the dir ( URL.GLOBAL )
 * should be the same as the test's source file's dir.
 */

import URL from "@candlefw/url";

assert(URL.GLOBAL.host == "localhost", browser);

assert(typeof window.location !== "undefined", browser);

assert(typeof window.location == URL + "", browser);

assert("Document is defined", typeof document !== "undefined", browser);

assert("Window is defined", typeof window !== "undefined", browser);

assert("Document Body is an HTML Element", document.body instanceof HTMLElement, browser);