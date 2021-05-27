import { JSNode } from "@candlelib/js";
import { StatementReference } from "../types/statement_props";
export function compileStatementsAndDeclarations(
    statement_reference: StatementReference,
    statement_index: number,
    statement_references: StatementReference[] = [],
    //Only function declarations are hoisted.
    declaration_references: StatementReference[] = []
) {


    const
        active_refs: Set<string> = new Set(statement_reference.required_references.values()),
        declared_refs: Set<string> = new Set(),
        statements: JSNode[] = [];

    for (let i = statement_index - 1; i > -1; i--) {

        const statement_ref = statement_references[i];

        let INCLUDE_STATEMENT = !!statement_ref.FORCE_USE;

        if (!INCLUDE_STATEMENT)
            for (const ref of active_refs.values()) {
                if (statement_ref.required_references.has(ref)
                    || statement_ref.declared_variables.has(ref)) {
                    INCLUDE_STATEMENT = true;
                    break;
                }
            }

        if (INCLUDE_STATEMENT) {

            statements.push(statement_ref.stmt);

            for (const ref of statement_ref.required_references.values())
                active_refs.add(ref);

            for (const ref of statement_ref.declared_variables.values()) {
                declared_refs.add(ref);
                active_refs.delete(ref);
            }
        }
    }


    for (let i = declaration_references.length - 1; i > -1; i--) {

        const declaration_ref = declaration_references[i];

        let INCLUDE_STATEMENT = false;


        for (const id_reference of active_refs.values()) {
            if (
                declaration_ref.required_references.has(id_reference)
                || declaration_ref.declared_variables.has(id_reference)
            ) {
                INCLUDE_STATEMENT = true;
                break;
            }
        }

        if (INCLUDE_STATEMENT) {

            for (const id_reference of declaration_ref.required_references.values())
                active_refs.add(id_reference);

            for (const id_declaration of declaration_ref.declared_variables.values())
                declared_refs.add(id_declaration);

            statements.push(declaration_ref.stmt);
        }
    }

    for (const ref of declared_refs.values())
        active_refs.delete(ref);

    return { required_statements: statements.reverse(), imports: active_refs };
}
