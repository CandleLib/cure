export function replaceNodes(node, parent, index) {

    const replaced = Object.assign({}, node);

    if (parent)
        parent.nodes[index] = replaced;

    if (replaced.nodes)
        replaced.nodes = replaced.nodes.slice();

    return replaced;
}
