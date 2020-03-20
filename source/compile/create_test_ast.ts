import { MinTreeNode, parser, MinTreeNodeType } from "@candlefw/js";
import { ImportDependNode } from "../types/import_depend_node.js";
export function createTestAST<T>(statements: T[], names: Set<string>, imports: ImportDependNode[]): {
    ast: MinTreeNode;
    imported_dependencies: ImportDependNode[];
} {
    //Add declarations and identify imports. 
    const ast = parser(";"),
        imported_dependencies = [];

    ast.nodes = <MinTreeNode[]><unknown>statements;

    for (const imp of imports) {
        for (const id of imp.import_names)
            if (names.has(id.import_name)) {
                imported_dependencies.push(imp);
                break;
            }
    }
    return { ast, imported_dependencies };
}
