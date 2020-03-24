import { Scope } from "../../types/scope.js";
import { inspect } from "../../test_running/test_harness.js";
import { stmt } from "@candlefw/js";

function firstIntersectionOfSets(setA, setB) {
    for (const a of setA.values())
        if (setB.has(a))
            return true;
    return false;
}

function getScopeStatements(scope: Scope) {
    return scope.stmts
        .flatMap(stm => stm.type == "SCOPE" ? getScopeStatements(stm) : stm);
}
export function getUsedStatements(scope: Scope, offset, names) {

    let AWAIT = false;

    const
        USE_ALL = scope.USE_ALL,

        statements = //USE_ALL
            //? scope.stmts.slice().reverse()
            //: 
            scope.stmts.slice(0, offset)
                .flatMap(stm => stm.type == "SCOPE" ? getScopeStatements(stm) : stm)
                .reverse(),

        out_statements = [];


    //First pass collects dependency names

    for (const statement of statements) {
        if (USE_ALL || firstIntersectionOfSets(names, statement.exports)) {
            for (const imp of statement.imports)
                names.add(imp);
        }
    }

    //Second pass collects statements

    for (const statement of statements) {
        if (USE_ALL || firstIntersectionOfSets(names, statement.exports)) {
            if (statement.AWAIT)
                AWAIT = true;
            out_statements.push(statement.ast);
        }
    }




    return { statements: out_statements.reverse(), names, AWAIT };
}
