import { JSNode, JSNodeType, stmt } from "@candlefw/js";
import { jst } from "./traverse_js_node.js";


export function replaceFirstBlockContentWithNodes(contains_block: JSNode, ...replacement_nodes: JSNode[]) {
    const receiver = { ast: null };

    for (const { node, meta } of jst(contains_block)
        .filter("type", JSNodeType.BlockStatement)
        .makeReplaceable()
        .extract(receiver)) {
        const new_block = stmt("{}");
        new_block.nodes.push(...replacement_nodes);
        meta.replace(new_block);
    }

    return receiver.ast;
}
;
