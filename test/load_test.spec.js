import { loadBindingCompiler, selectBindingCompiler, clearBindingsCompilers, test } from "../build/library/compile/binding_compiler_manager.js";

import { MinTreeNodeType, exp } from "@candlefw/js";

"Compiler.Binding Compiler";

const test_compiler = {
    signature: MinTreeNodeType.AssignmentExpression,
    test: () => true,
    build: node => {
        "The correct node is filtered";
        ((node.type == MinTreeNodeType.AssignmentExpression));
    },
    getExceptionMessage: () => "This test failed"
};

const LOADED = loadBindingCompiler(test_compiler);

"loadBindingCompiler returns true if a binding compiler has been loaded into the manager";
((LOADED == true));

"Returns false if an attempt is made to load an incomplete binding compiler";
((loadBindingCompiler({ signature: MinTreeNodeType.AwaitExpression }) == false));

"Returns an array of compilers whose signature matches the nodes type.";
((selectBindingCompiler(exp("a = 2")) == [test_compiler]));

"Returns true if a binding compiler has been loaded into the manager 2";
((selectBindingCompiler(exp("a = 2")) == [test_compiler]));

"Expect to throw";
((!test()));

"#AFTER EACH";
clearBindingsCompilers();