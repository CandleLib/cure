import { JSNode, JSNodeType, ext } from "@candlefw/js";
import { jst } from "../compile_statements.js";
import { inspect } from "../../test_running/test_harness.js";


function fillInput(set_from, set_to) {
    for (const v of set_from.values())
        set_to.add(v);
}

export function buildAssertionSiteAst(current_scope, symbols) {
    let AWAIT = current_scope.AWAIT || false;


    const { scope: outer_scope, prev_symbol, root } = current_scope;
    //Collect all necessary previous statements
    // inspect(1, 1, prev_stmts);;
    let flag = 0n, temp_stmts = [], inputs = new Set(symbols);

    for (const sym of symbols.values()) {

        let stmt = prev_symbol.get(sym);

        if (stmt && !(stmt.id & flag)) {

            flag |= stmt.id;

            temp_stmts.push(stmt);

            fillInput(stmt.inputs, inputs);

            for (const linked of stmt.links) {

                if (!(linked.id & flag)) {

                    flag |= linked.id;

                    temp_stmts.push(linked);

                    fillInput(linked.inputs, inputs);

                }
            }
        }
    }

    let { node: ast, body } = getClosureBody(root);

    body.nodes = temp_stmts
        .sort((a, b) => a.id < b.id ? -1 : 1)
        .map(stmt => stmt.root);

    if (outer_scope) {

        const { root, body, inputs: new_inputs, AWAIT: OUTER_AWAIT } = buildAssertionSiteAst(outer_scope, new Set([...current_scope.inputs.values(), ...symbols.values()]));

        inputs = new_inputs;

        body.nodes.push(ast);

        ast = root;

        AWAIT = OUTER_AWAIT || AWAIT;
    }

    return { root: ast, body, inputs, AWAIT };
}

/**
 * Retrieve the node the at represents the closure
 * bearing body of the root node. if such a node
 * cannot be found the both return object will be
 * null. Otherwise, return value `{ body , node }`
 * Will be a copied node if the enclosing body,
 * and a clone of the root node, respectively.
 * 
 * @param root - Root @type {MinTree} node with an assumed closure body.
 */
export function getClosureBody(root: JSNode) {

    let body = null, original_body, receiver = { ast: null };

    /**
     * Replace nodes within a closure body with the
     * with the selected statements. A closure body
     * is any statement with an enclosing bracketed
     * body that creates a new variable and lexical
     * scope, including the top level script/module
     * body. It is important to note that the skip
     * method SHOULD skip over all other nodes, else
     * may cause issue if the closure node is 
     * found further down the graph pass depth  of 2
     *
     */
    for (const { node, meta: { skip, replace } } of jst(root, 2)
        .filter("type",
            JSNodeType.Script,
            JSNodeType.Module,
            JSNodeType.FunctionBody,
            JSNodeType.BlockStatement
        ).makeReplaceable()
        .makeSkippable()
        .extract(receiver)
    ) { skip(); original_body = node; body = Object.assign({}, node); body.nodes = null; replace(body); }

    return { node: receiver.ast, body, original_body };
}

