import { MinTreeNodeType as $, MinTreeNodeClass, MinTreeNode, MinTreeNodeType, render, ext, extendAll } from "@candlefw/js";
import { traverse, filter, make_skippable, bit_filter, skip_root } from "@candlefw/conflagrate";
import { inspect } from "../../test_running/test_harness.js";
import { start } from "repl";

function getImports(node, declared, imports, exports, start) {

    for (let i = start; i < node.nodes.length; i++)
        if (node.nodes[i])
            eid(node.nodes[i], declared, imports, exports);

    return imports;
}

const empty = { add: () => { }, has: () => false };

/**
 * Identifies variable dependencies and places them in sets.
 * @param ast
 * @param in_set
 * @param out_set
 */
function eid(
    ast: MinTreeNode,
    declared: Set<string> = new Set(),
    imports: Set<string> = new Set(),
    exports: Set<string> = new Set()
): {
    AWAIT: boolean;

    /**
     * Set of declared variables
     */
    declared: Set<string>,

    /**
     * Set of undeclared variables
     */
    imports: Set<string>,

    /**
     * Set of undeclared and declared variables
     */
    exports: Set<string>,
} {


    let AWAIT = false,
        FUNCTION = !!(ast.type & MinTreeNodeClass.FUNCTION),
        BLOCK = !!(ast.type & MinTreeNodeClass.BLOCK) || FUNCTION;
    const typ = [];
    if (ast)
        //Extract References and Bindings and check for await expression
        for (const { node } of traverse(ast, "nodes")
            .then(skip_root())
            .then(make_skippable())
        ) {
            const type = node.type;
            typ.push(MinTreeNodeType[type]);

            if (type == MinTreeNodeType.AwaitExpression) {
                AWAIT = true;
            } else if (type & MinTreeNodeClass.IDENTIFIER) {

                if (type & MinTreeNodeClass.PROPERTY_NAME)
                    continue;

                const value = <string>node.value;

                switch (type) {
                    case $.IdentifierBinding:
                        declared.add(value);
                        if (!BLOCK)
                            exports.add(value);
                        break;
                    case $.Identifier:
                    case $.IdentifierReference:
                    case $.IdentifierName:
                    default: {


                        const HAS_VALUE = declared.has(value);

                        if (!HAS_VALUE) imports.add(value);

                        if (BLOCK && HAS_VALUE) break;

                        exports.add(value);

                    }
                        break;
                }

            } else {
                switch (type) {
                    case MinTreeNodeType.FunctionDeclaration:
                    case MinTreeNodeType.FunctionExpression:
                        const [id] = node.nodes;
                        if (id) exports.add(<string>id.value);
                        eid(node, declared, imports, exports);
                        break;
                    case MinTreeNodeType.FormalParameters:
                    case MinTreeNodeType.LexicalDeclaration: {
                        eid(node, declared, imports, exports);
                    } break;
                    case MinTreeNodeType.VariableDeclaration: {
                        //@ts-ignore
                        eid(node, FUNCTION ? declared : empty, imports, exports);
                    } break;
                    case MinTreeNodeType.BlockStatement: {
                        eid(node, new Set(declared), imports, exports);
                        node.skip();
                    }
                }
            }
        }

    return { AWAIT, imports, exports: exports, declared };
}

export { eid as extractIdentifierDependencies };