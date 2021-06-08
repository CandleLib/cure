/**[API]:testing
 * 
 * Using the `browser` argument switch causes the test
 * to run within a browser iframe.
 */

import URL from "@candlelib/uri";

assert(skip, URL.GLOBAL.host == "localhost", browser);

assert(skip, typeof window.location !== "undefined", browser);

assert(skip, window.location.href == URL.GLOBAL.toString(), browser);

assert(skip, "Document is defined", typeof document !== "undefined", browser);

assert(skip, "Window is defined", typeof window !== "undefined", browser);

assert(skip, "Document Body is an HTML Element", document.body instanceof HTMLElement, browser);