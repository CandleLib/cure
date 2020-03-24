import { MinTreeNodeClass, MinTreeNode, stmt, MinTreeNodeType, exp, parser } from "@candlefw/js";
import { traverse, bit_filter, make_replaceable, extract, replace } from "@candlefw/conflagrate";

import { selectBindingCompiler } from "./assertion_compiler_manager.js";
import { Reporter } from "../../main.js";

/**
 * Compiles an Assertion Site. 
 * 
 * @param node - An expression node within the double parenthesize Assertion Site. 
 * @param reporter - A Reporter for color data.
 * @param origin File path of the source test file.
 */
export function compileAssertionSite(expr: MinTreeNode, reporter: Reporter, origin: string = "")
    : { ast: MinTreeNode, optional_name: string; } {


    for (const binding_compiler of selectBindingCompiler(expr)) {

        if (binding_compiler.test(expr)) {

            const
                js_string = binding_compiler.build(expr),

                { highlight, message, match, column, line } = binding_compiler.getExceptionMessage(expr, reporter),

                error_data = [
                    `\`${message}\``,
                    `"${origin}"`,
                    line || expr.pos.line,
                    column || expr.pos.char,
                    `\`${match.replace(/"/g, "\"")}\``,
                    `\"${highlight.replace(/"/g, "\\\"")}\"`
                ];
            const
                thr =
                    message ?
                        parser(`if(${js_string}) $harness.setException(new AssertionError(${error_data}));`)
                        : parser(`if(${js_string});`),

                receiver = { ast: null };


            for (const { node } of traverse(thr, "nodes")

                .then(extract(receiver))

                .then(replace(node => (node.pos = expr.pos, node)))

                .then(bit_filter("type", MinTreeNodeClass.IDENTIFIER))

                .then(make_replaceable())) {

                if (node.value == "t")
                    node.replace(expr);
            }

            return { ast: receiver.ast || stmt(";"), optional_name: match };
        }
    }

    //Bypass the test
    return { ast: expr, optional_name: `Could not find a AssertionSiteCompiler for MinTreeNode [${MinTreeNodeType[expr.type]}]`, };
}
