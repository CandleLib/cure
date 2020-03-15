import { MinTreeNodeClass, MinTreeNode, stmt, MinTreeNodeType } from "@candlefw/js";
import { traverse, bit_filter, make_replaceable, extract, replace } from "@candlefw/conflagrate";

import { selectBindingCompiler } from "./assertion_compiler_manager.js";

export function compileAssertionSite(node: MinTreeNode): MinTreeNode {

    const
        expr = node.nodes[0].nodes[0].nodes[0];

    for (const binding_compiler of selectBindingCompiler(expr)) {
        if (binding_compiler.test(expr)) {

            const
                js_string = binding_compiler.build(expr),

                error_strings = binding_compiler.getExceptionMessage(expr),

                { highlight, message, match, column, line } = error_strings,

                error_data = [
                    `\`${message}\``,
                    line || expr.pos.line,
                    column || expr.pos.char,
                    `\"${match.replace(/"/g, "'")}\"`,
                    `\"${highlight.replace(/"/g, "'")}\"`
                ];

            const
                thr = stmt(`if(${js_string}) $cfw.setException(new AssertionError(${error_data}));`),

                landing = { ast: null };

            for (const node of traverse(thr, "nodes")

                .then(extract(landing))

                .then(replace(node => (node.pos = expr.pos, node)))

                .then(bit_filter("type", MinTreeNodeClass.IDENTIFIER))

                .then(make_replaceable())) {

                if (node.value == "t")
                    node.replace(expr);
            }

            return landing.ast;
        }
    }

    //create new script
    return null;
}
