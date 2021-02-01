import { compileTestyScript } from "../build/library/compile/expression_handler/testy_compiler.js";
import { createGlobalsObject } from "./tools.js";

const globals = createGlobalsObject();

assert("Compile built-in == assertion", compileTestyScript("$$1==$$1", globals) == "$harness.equal($harness.getValue(1), $harness.getValue(1))");
