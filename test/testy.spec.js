import { compileTestyScript } from "../build/library/compile/expression_handler/testy_compiler.js";
import { createGlobalsObject } from "./tools.js";

const globals = createGlobalsObject();

assert("Compile built-in [==] equality assertion", compileTestyScript("$$1==$$1", globals) == "$harness.equal($harness.getValue(1), $harness.getValue(1))");
assert("Compile built-in [===] strict equality assertion", compileTestyScript("$$1===$$1", globals) == "$harness.equal($harness.getValue(1), $harness.getValue(1))");
assert("Compile built-in [!] throws assertion", compileTestyScript("!{$$0,$$1}", globals) == "$harness.throws($harness.getValueRange(0,1))");
assert("Compile built-in [noThrow] does not throw assertion", compileTestyScript("noThrow {$$0,$$1}", globals) == "$harness.doesNotThrow($harness.getValueRange(0,1))");
assert("Compile built-in [&&] AND", compileTestyScript("$$0 && $$1", globals) == "$harness.and($harness.getValue(0), $harness.getValue(1))");
assert("Compile built-in [||] OR", compileTestyScript("$$0 || $$1", globals) == "$harness.or($harness.getValue(0), $harness.getValue(1))");
assert("Compile built-in [{#,#}] value range", compileTestyScript("{$$0,$$10}", globals) == "$harness.getValueRange(0,10)");
assert("Compile complex expression [ (($$1 > $$2) && !{$$0,$$1}) ] ", compileTestyScript("(($$1 > $$2) && !{$$0,$$1})", globals)
    == "$harness.and($harness.greaterThan($harness.getValue(1), $harness.getValue(2)), $harness.throws($harness.getValueRange(0,1)))");
