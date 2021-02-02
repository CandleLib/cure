import { compileTestyScript } from "../build/library/compile/expression_handler/testy_compiler.js";
import { createGlobalsObject } from "./tools.js";

const globals = createGlobalsObject();

assert("Compile built-in [==] equality assertion", compileTestyScript("$$1==$$1", globals) == "$$h.equal($$h.getValue(1), $$h.getValue(1))");
assert("Compile built-in [===] strict equality assertion", compileTestyScript("$$1===$$1", globals) == "($$h.getValue(1)===$$h.getValue(1))");
assert("Compile built-in [!] throws assertion", compileTestyScript("!{$$0,$$1}", globals) == "$$h.throws($$h.getValueRange(0,1))");
assert("Compile built-in [noThrow] does not throw assertion", compileTestyScript("noThrow {$$0,$$1}", globals) == "$$h.doesNotThrow($$h.getValueRange(0,1))");
assert("Compile built-in [&&] AND", compileTestyScript("$$0 && $$1", globals) == "($$h.getValue(0)&&$$h.getValue(1))");
assert("Compile built-in [||] OR", compileTestyScript("$$0 || $$1", globals) == "($$h.getValue(0)||$$h.getValue(1))");
assert("Compile built-in [{#,#}] value range", compileTestyScript("{$$0,$$10}", globals) == "$$h.getValueRange(0,10)");
assert("Compile complex expression [ (($$1 > $$2) && !{$$0,$$1}) ] ", compileTestyScript("(($$1 > $$2) && !{$$0,$$1})", globals)
    == "(($$h.getValue(1)>$$h.getValue(2))&&$$h.throws($$h.getValueRange(0,1)))");
