import { JSNode } from "@candlefw/js";
import { StatementProp } from "../types/statement_props";
export function compileStatementsAndDeclarations(
    ref: StatementProp,
    offset: number,
    statements: StatementProp[] = [],
    //Only function declarations are hoisted.
    declarations: StatementProp[] = []
) {


    const
        active_refs: Set<string> = new Set(ref.required_references.values()),
        declared_refs: Set<string> = new Set(),
        stmts: JSNode[] = [];

    for (let i = offset - 1; i > -1; i--) {

        const stmt = statements[i];

        let use = !!stmt.FORCE_USE;

        if (!use)
            for (const ref of active_refs.values()) {
                if (stmt.required_references.has(ref)
                    || stmt.declared_variables.has(ref)) {
                    use = true;
                    break;
                }
            }

        if (use) {

            stmts.push(stmt.stmt);

            for (const ref of stmt.required_references.values())
                active_refs.add(ref);

            for (const ref of stmt.declared_variables.values()) {
                declared_refs.add(ref);
                active_refs.delete(ref);
            }
        }
    }


    for (let i = declarations.length - 1; i > -1; i--) {

        const declaration = declarations[i];

        let use = false;

        for (const ref of active_refs.values()) {
            if (declaration.required_references.has(ref) || declaration.declared_variables.has(ref)) {
                use = true;
                break;
            }
        }

        if (use) {

            for (const ref of declaration.required_references.values())
                active_refs.add(ref);

            for (const ref of declaration.declared_variables.values())
                declared_refs.add(ref);

            stmts.push(declaration.stmt);
        }
    }

    for (const ref of declared_refs.values())
        active_refs.delete(ref);

    return { stmts: stmts.reverse(), imports: active_refs };
}
