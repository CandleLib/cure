import { parser, MinTreeNodeClass, MinTreeNode, stmt, ext } from "@candlefw/js";
import { traverse, bit_filter, make_replaceable, extract, replace } from "@candlefw/conflagrate";
import { selectBindingCompiler } from "./binding_compiler_manager.js";
export function CompileBinding(binding, statements, origin) {

    const
        node = parser`;`,
        test_statements =
            node.nodes;

    test_statements.length = 0;

    for (let i = 0; i < binding.index; i++)
        test_statements.push(statements[i].node);

    const
        expr = <MinTreeNode>binding.node.nodes[0].nodes[0].nodes[0];

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
                    `\`${match}\``,
                    `\`${highlight}\``
                ];

            const
                thr = stmt(`if(${js_string}) i.setException(new AssertionError(${error_data}));`),

                landing = { ast: null };

            for (const node of traverse(thr, "nodes")

                .then(extract(landing))

                .then(replace(node => (node.pos = expr.pos, node)))

                .then(bit_filter("type", MinTreeNodeClass.IDENTIFIER))

                .then(make_replaceable())) {

                if (node.value == "t")
                    node.replace(expr);
            }

            test_statements.push(landing.ast);
            break;
        }
    }

    //create new script
    return { ast: node, name: binding.name || "undefined", error: null, stmts: test_statements };
}
