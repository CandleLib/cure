import { MinTreeNodeType } from "@candlefw/js";

import { TestError } from "../test_running/test_error.js";
import { AssertionSite } from "../types/assertion_site.js";
import { ImportDependNode } from "../types/import_depend_node.js";
import { RawTestRig } from "../types/raw_test.js";

import { compileAssertionSite } from "./assertion_site/compile_assertion_site.js";
import { getUsedStatements } from "./utils/get_used_statements.js";
import { compileOuterScope } from "./compile_outer_scope.js";
import { Reporter } from "../main.js";
import { createTestAST } from "./create_test_ast.js";

export function


    compileTestRig(
        { name_data: { name, suite_names }, ast: node, scope, names, index, start, AWAIT, SOLO, INSPECT, RUN }: AssertionSite,
        imports: ImportDependNode[],
        reporter: Reporter,
        origin: string)
    : RawTestRig {

    let
        IS_ASYNC = AWAIT,
        //{ root, nodes } = scope,
        { ast: assertion_statement, optional_name } = compileAssertionSite(node, reporter, origin);



    if (!assertion_statement) {

        const expr = node.nodes[0].nodes[0].nodes[0];

        return {
            type: "DISCRETE",
            name: [...suite_names, (name || optional_name)].join("-->"),
            IS_ASYNC: false,
            index,
            imports: [],
            ast: null,
            pos: node.pos,
            SOLO, INSPECT, RUN,
            error: new TestError(
                `Could not find a AssertionSiteCompiler for MinTreeNode [${MinTreeNodeType[expr.type]}]`,
                origin,
                expr.pos.line,
                expr.pos.char,
                "",
                "")
        };

    } else {

        let statements = [];

        const { statements: s, names: n, AWAIT } = getUsedStatements(scope, start, names),
            async_check = { is: false };

        if (AWAIT)
            IS_ASYNC = true;

        statements = s;

        statements.splice(start, 0, assertion_statement);

        names = n;

        if (scope.parent)
            statements = [...compileOuterScope(scope, names, async_check), ...statements];

        if (async_check.is)
            IS_ASYNC = true;

        const { ast, imported_dependencies } = createTestAST(statements, names, imports);

        return {
            type: "DISCRETE",
            name: [...suite_names,
            (name || optional_name)].join("-->"),
            ast,
            imports: imported_dependencies,
            pos: node.pos,
            index,
            SOLO, INSPECT, RUN,
            IS_ASYNC
        };
    }
}


