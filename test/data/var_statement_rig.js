/**[API]:testing-component-data
 *
 *  A component that imports another component from a non-existent
 *  URI should render an error component in it's place.
 */

// Since there is no implementation here this will throw an error
// when inspected by cfw.docs or candle.cure.
import wick from "@candlelib/wick";

var comp = await wick("/test/compile/component_style.wick");

assert(comp, inspect);