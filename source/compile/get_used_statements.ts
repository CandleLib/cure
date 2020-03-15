import { Scope } from "../types/scope.js";

function partialIntersectionOfSets(setA, setB) {
    for (const a of setA.values())
        if (setB.has(a))
            return true;
    return false;
}


export function getUsedStatements(scope: Scope, offset, names) {

    const
        USE_ALL = scope.USE_ALL,
        statements = USE_ALL
            ? scope.stmts.slice().reverse()
            : scope.stmts.slice(0, offset).reverse(),
        out_statements = [];

    for (const statement of statements) {

        if (USE_ALL || partialIntersectionOfSets(names, statement.exports)) {

            for (const imp of statement.imports)
                names.add(imp);

            out_statements.push(statement.ast);
        }
    }

    return { statements: out_statements.reverse(), names };
}
