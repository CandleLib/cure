import { JSNode, JSNodeType, renderCompressed } from "@candlefw/js";
import { jst } from "./jst.js";

type AssertionSiteArgs = {
    assertion_expr: any;
    BROWSER: any;
    INSPECT: boolean;
    SKIP: boolean;
    SOLO: boolean;
    SEQUENCED: boolean;
    name: string;
    timeout_limit: number;
};

export function parseAssertionArguments(call_node: JSNode): AssertionSiteArgs {

    const result: AssertionSiteArgs = {
        assertion_expr: null,
        BROWSER: null,
        INSPECT: false,
        SKIP: false,
        SOLO: false,
        SEQUENCED: false,
        name: "",
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

        else if (Node_Is_A_String(node))

            handleStringArgument(result, node);

        else
            handleOtherExpressionTypes(result, node, mutate);


        skip();
    }

    return result;
}

function Node_Is_A_String(node: JSNode) {
    return node.type == JSNodeType.StringLiteral;
}

function Node_Is_An_Identifier(node: JSNode) {
    return node.type == JSNodeType.IdentifierReference;
}


function Node_Is_A_Call(node: JSNode) {
    return node.type == JSNodeType.CallExpression;
}

function Node_Is_A_Number(node: JSNode) {
    return node.type == JSNodeType.NumericLiteral && Number.isInteger(parseFloat(<string>node.value));
}

function handleOtherExpressionTypes(result: AssertionSiteArgs, node: JSNode, mutate: (replacement_node: JSNode) => void) {

    if (Node_Is_A_Call(node)) {
        const [name, first_argument] = node.nodes;

        if (name.value.toString().toLowerCase() == "name") {
            //console.log(name, first_argument);
            mutate(null);
            return;
        }
    }

    if (result.assertion_expr)
        throw createMultipleAssertionExpressionError(node, result.assertion_expr);

    result.assertion_expr = node;
}

function handleStringArgument(result: AssertionSiteArgs, node: JSNode) {
    if (result.name == "") result.name = <string>node.value;
}

function handleNumericArguments(result: AssertionSiteArgs, node: JSNode) {
    result.timeout_limit = parseFloat(<string>node.value);
}

function handleIdentifierArguments(node: JSNode, result: AssertionSiteArgs) {

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
    return [new_expr.pos.errorMessage(`Cannot add assertion expression [${renderCompressed(new_expr)}]`),
    existing_expr.pos.errorMessage(`Candidate assertion expression [${renderCompressed(existing_expr)}] already passed to this function.`)].join("\n");
}

