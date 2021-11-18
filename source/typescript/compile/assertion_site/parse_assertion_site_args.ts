import { exp, JSCallExpression, JSIdentifierReference, JSNode, JSNodeClass, JSNodeType, renderCompressed, stmt, tools } from "@candlelib/js";
import { AssertionSiteArguments } from "../../types/assertion_site_arguments.js";
import { jst } from "../utilities/traverse_js_node.js";


export function parseAssertionSiteArguments(call_node: JSNode): AssertionSiteArguments {

    const result = {
        assertion_expr: null,
        BROWSER: null,
        INSPECT: false,
        SKIP: false,
        SOLO: false,
        SEQUENCED: false,
        name_expression: null,
        name: null,
        timeout_limit: 0
    };

    for (const { node, meta: { skip, mutate } } of jst(call_node.nodes[1], 2)
        .skipRoot()
        .makeSkippable()
        .makeMutable()
    ) {

        if (Node_Is_An_Identifier(node))

            handleIdentifierArguments(node, result);

        else if (Node_Is_A_Number(node))

            handleNumericArguments(result, node);

        else if (Node_Is_A_String(node)) {

            handleStringArgument(result, node);


        } else
            handleOtherExpressionTypes(result, node, mutate);


        skip();
    }

    if (result.SKIP)
        result.assertion_expr = null;

    return result;
}

function Node_Is_A_String(node: JSNode) {
    return node.type == JSNodeType.StringLiteral
        || (node.type == JSNodeType.Template && node.nodes.length == 1);
}

function Node_Is_An_Identifier(node: JSNode): node is JSIdentifierReference {
    return node.type == JSNodeType.IdentifierReference;
}


function Node_Is_A_Call(node: JSNode): node is JSCallExpression {
    return node.type == JSNodeType.CallExpression;
}

function Node_Is_A_Number(node: JSNode) {
    return node.type == JSNodeType.NumericLiteral && Number.isInteger(parseFloat(<string>node.value));
}

function handleOtherExpressionTypes(result: AssertionSiteArguments, node: JSNode, mutate: (replacement_node: JSNode) => void) {

    if (Node_Is_A_Call(node)) {

        const [id, args] = node.nodes, [first_argument] = args.nodes;

        if (
            tools.getIdentifierName(id).toLowerCase() == "name"
            &&
            first_argument.type | JSNodeClass.EXPRESSION
        ) {
            result.name_expression = first_argument;
            mutate(null);
            return;
        }
    }

    if (result.assertion_expr)
        throw createMultipleAssertionExpressionError(node, result.assertion_expr);

    result.assertion_expr = node;
}

function handleStringArgument(result: AssertionSiteArguments, node: JSNode) {

    if (!result.name && node.type == JSNodeType.Template)
        result.name = node.nodes[0].value.replace(/\n/g, "\\n").replace(/\"/g, "\\\"");
    else if (!result.name) result.name = <string>node.value;
}

function handleNumericArguments(result: AssertionSiteArguments, node: JSNode) {
    result.timeout_limit = parseFloat(<string>node.value);
}

function handleIdentifierArguments(node: JSIdentifierReference, result: AssertionSiteArguments) {

    const val = (<string>node.value).toLowerCase();

    // Remove the value from the node to 
    // prevent the node from contributing
    // to the assertion's required references
    if (val == "sequence" || val == "seq") {
        result.SEQUENCED = true;
    } else if (val == "skip") {
        node.value = "";
        result.SKIP = true;
    } else if (val == "only" || val == "solo") {
        node.value = "";
        result.SOLO = true;
    } else if (val == "inspect" || val == "i") {
        node.value = "";
        result.INSPECT = true;
    } else if (val == "browser" || val == "b") {
        node.value = "";
        result.BROWSER = true;
    }
}

function createMultipleAssertionExpressionError(new_expr: JSNode, existing_expr: JSNode) {
    return [new_expr.pos.createError(`Cannot add assertion expression [${renderCompressed(new_expr)}]`),
    existing_expr.pos.createError(`Candidate assertion expression [${renderCompressed(existing_expr)}] already passed to this function.`)].join("\n");
}

