/**[API]:testing
 * 
 * Using the `browser` argument switch causes the test
 * to run within a browser iframe.
 */

import URL from "@candlefw/url";

assert(URL.GLOBAL.host == "localhost", browser);

assert(typeof window.location !== "undefined", browser);

assert(window.location.href == URL.GLOBAL.toString(), browser);

assert("Document is defined", typeof document !== "undefined", browser);

assert("Window is defined", typeof window !== "undefined", browser);

assert("Document Body is an HTML Element", document.body instanceof HTMLElement, browser);