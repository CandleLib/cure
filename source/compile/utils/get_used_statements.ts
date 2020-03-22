import { Scope } from "../../types/scope.js";
import { render } from "@candlefw/js";

function partialIntersectionOfSets(setA, setB) {
    for (const a of setA.values())
        if (setB.has(a))
            return true;
    return false;
}


export function getUsedStatements(scope: Scope, offset, names) {


    let AWAIT = false;

    const
        USE_ALL = scope.USE_ALL,

        statements = USE_ALL
            ? scope.stmts.slice().reverse()
            : scope.stmts.slice(0, offset).reverse(),
        out_statements = [];

    //First pass collects names
    //Second pass collects statements

    for (const statement of statements) {
        if (USE_ALL || partialIntersectionOfSets(names, statement.exports)) {
            for (const imp of statement.imports)
                names.add(imp);
        }
    }

    for (const statement of statements) {
        if (USE_ALL || partialIntersectionOfSets(names, statement.exports)) {
            for (const imp of statement.imports)
                names.add(imp);
            if (statement.AWAIT)
                AWAIT = true;
            out_statements.push(statement.ast);
        }
    }
    return { statements: out_statements.reverse(), names, AWAIT };
}
