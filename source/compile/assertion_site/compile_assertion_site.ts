import { MinTreeNodeClass, MinTreeNode, stmt, MinTreeNodeType, exp, parser } from "@candlefw/js";
import { traverse, bit_filter, make_replaceable, extract, replace } from "@candlefw/conflagrate";
import CompilerBindings from "./assertion_compilers.js";
import { selectBindingCompiler, loadBindingCompiler } from "./assertion_compiler_manager.js";
import { Reporter } from "../../main.js";

/**
 * Preload Default AssertionSite Compilers
 */
CompilerBindings.map(loadBindingCompiler);


/**
 * Compiles an Assertion Site. 
 * 
 * @param node - An expression node within the double parenthesize Assertion Site. 
 * @param reporter - A Reporter for color data.
 * @param origin File path of the source test file.
 */
export function compileAssertionSite(expr: MinTreeNode, reporter: Reporter)
    : { ast: MinTreeNode, optional_name: string; } {


    for (const binding_compiler of selectBindingCompiler(expr)) {

        if (binding_compiler.test(expr)) {

            const
                js_string = binding_compiler.build(expr),

                { highlight, message, match, column, line } = binding_compiler.getExceptionMessage(expr, reporter),

                error_data = [
                    `\`${message}\``,
                    `""`,
                    line + 1 || expr.pos.line + 1,
                    column + 1 || expr.pos.char + 1,
                    `\`${match.replace(/"/g, "\"")}\``,
                    `\`${highlight.replace(/"/g, "\\\"")}\``
                ];
            const
                thr =
                    message ?
                        parser(`if(${js_string}) $harness.setException(new AssertionError(${error_data}));`)
                        : parser(`if(${js_string});`),

                receiver = { ast: null };


            for (const { node, meta } of traverse(thr, "nodes")

                //.extract(receiver)

                //.replace(node => (node.pos = expr.pos, node))

                //.bitFilter("type", MinTreeNodeClass.IDENTIFIER)

                //.makeReplaceable()
            ) {
                node.pos = expr.pos;
            }

            return { ast: thr || stmt(";"), optional_name: match };
        }
    }

    //Bypass the test
    return { ast: expr, optional_name: `Could not find a AssertionSiteCompiler for MinTreeNode [${MinTreeNodeType[expr.type]}]`, };
}
