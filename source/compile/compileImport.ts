import { ext, MinTreeNodeType } from "@candlefw/js";
import { traverse, make_skippable, filter } from "@candlefw/conflagrate";
import URL from "@candlefw/url";
import { MinTreeExtendedNode } from "@candlefw/js/build/types/types/mintree_extended_node";
import { ImportDependNode } from "../types/ImportDependNode";
export function compileImport(node: MinTreeExtendedNode, imports: ImportDependNode[]) {
    let url = new URL(<string>ext(node, true).from.url.value);
    const obj = <ImportDependNode>{
        imports: new Set,
        exports: new Set,
        import_names: [],
        module_source: url.path,
        IS_RELATIVE: url.IS_RELATIVE
    };
    for (const id of traverse(node, "nodes")
        .then(filter("type", MinTreeNodeType.Specifier, MinTreeNodeType.IdentifierModule, MinTreeNodeType.IdentifierDefault))
        .then(make_skippable())) {
        if (id.type == MinTreeNodeType.Specifier) {
            const { original, transformed } = ext(id);
            id.skip();
            obj.import_names.push({ import_name: <string>transformed.value, module_name: <string>original.value });
        }
        else if (id.type == MinTreeNodeType.IdentifierDefault) {
            obj.import_names.push({ import_name: <string>id.value, module_name: "default" });
        }
        else {
            obj.import_names.push({ import_name: <string>id.value, module_name: <string>id.value });
        }
    }
    ;
    obj.import_names.forEach(n => obj.exports.add(n.import_name));
    imports.push(obj);
}
