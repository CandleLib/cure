import { traverse } from "@candlefw/conflagrate";
import { JSNode, JSNodeClass, JSNodeType, tools, renderCompressed, stmt as parse_statement } from "@candlefw/js";

import { ImportModule } from "../types/import_module.js";
import { RawTestRig } from "../types/raw_test.js";

import { Reporter } from "../main.js";
import { compileImport } from "./compile_import.js";
import { buildAssertionSiteNode } from "./build_assertion_site_rig.js";
import { StatementProp } from "./statement_props";
import { gatherStatementsAndDeclarations } from "./gather_statements_amd_declarations.js";
import { cSet, cUnion, cDiff } from "./closure_set.js";

type RigCase = {
    rig: RawTestRig;
    data: StatementProp;
    offset: number;
};
export const jst = (node: JSNode, depth?: number) => traverse(node, "nodes", depth);

export type RawRigs = Array<{ rig: RawTestRig, import_names: Set<string>; }>;

function isExprStmtAssertionSite(stmt: JSNode): boolean {
    if (stmt.type == JSNodeType.ExpressionStatement) {
        if (stmt.nodes[0].type == JSNodeType.CallExpression) {
            if (id(stmt.nodes[0].nodes[0]) == "assert") {
                return true;
            }
        }
    }
    return false;
}

function compileSequencedTests({ INSPECT, SOLO, RUN, name, index, pos, ast }, i) {

    return { INSPECT, SOLO, RUN: true, name, index: i, pos };
}

const { getIdentifierName: id } = tools;

/**[API]
 * Generates test rigs from all code within a file and 
 * assertion sites from call expression  statements that
 * have this signature:
 * - `assert( expression [, inspect [, solo [, skip [, <string_name>] ]  ] ] ] );`
 * 
 * Inspection and Solo can be configured by
 * using `inspect`, `solo`, `skip`, and/or a string (for the test name)
 * as one or two of the arguments to the assertion
 * call statement. It does not matter which arg position. 
 * 
 * Will throw if there is more than one argument to an assertion call
 * that is not one of `inspect`, `solo`, `i`, or `s`.
 */
/**
 * Generates a graph accessible symbols from any givin line within a 
 * source file.
 */
//Only top level assertion sites can be made discrete. Any nested assertion site
//will an active captive of any TL assertion site that has dependencies on statements
//that call the site. 
export function compileRawTestRigs(
    ast: JSNode,
    report: Reporter,
    imports: ImportModule[],
    LEAVE_ASSERTION_SITE = false
): StatementProp {

    let lex_decl: cSet | Set<string> = new Set;
    let glbl_decl: cSet | cUnion | cDiff | Set<string> = new Set;
    let glbl_ref: cSet | cUnion | Set<string> = new Set;

    const
        tests: RigCase[] = [],
        statements: StatementProp[] = [],
        //Only function declarations are hoisted.
        declarations: StatementProp[] = [];

    let
        AWAIT = false,
        active_name = "";

    if (
        ast.type == JSNodeType.FunctionDeclaration
        ||
        ast.type == JSNodeType.FunctionExpression
        ||
        ast.type == JSNodeType.ArrowFunction
    ) {
        if (ast.type !== JSNodeType.ArrowFunction) {

            const [id_node] = ast.nodes;

            if (id_node) glbl_decl.add(id(id_node));
        }
    }

    for (let { node, meta: { skip, mutate } } of jst(ast)
        .skipRoot()
        .makeSkippable()
        .makeMutable()
    ) {
        switch (node.type) {

            case JSNodeType.FormalParameters: continue;

            case JSNodeType.ImportDeclaration: compileImport(node, imports); skip(); break;

            case JSNodeType.IdentifierBinding: if (id(node)) glbl_decl.add(id(node)); break;

            case JSNodeType.IdentifierReference: if (id(node)) glbl_ref.add(id(node)); break;

            case JSNodeType.AwaitExpression: AWAIT = true; break;

            case JSNodeType.ExpressionStatement: {

                let [expr] = node.nodes;

                if (node.nodes[0].type == JSNodeType.AwaitExpression) {
                    AWAIT = true;
                    expr = expr.nodes[0];
                }

                if (isExprStmtAssertionSite(node)) {

                    expr.nodes[0].value = ""; // Forcefully delete assert name

                    const
                        rig = buildAssertionSiteNode(expr, report, tests.length),
                        data = compileRawTestRigs(
                            expr,
                            report,
                            imports,
                            false,
                        );

                    rig.name = rig.name || active_name || renderCompressed(rig.expression);

                    if (LEAVE_ASSERTION_SITE) {
                        for (const ref of data.required_references.values())
                            glbl_ref.add(ref);

                        mutate(rig.ast);
                    } else
                        mutate(null);

                    // Forcefully remove assert name to prevent it being used
                    // as a reference lookup
                    expr.nodes[0].value = "";

                    const pending = { rig, data, offset: statements.length };

                    tests.push(pending);

                    active_name = "";

                    skip();

                } else if (node.nodes[0].type == JSNodeType.StringLiteral) {

                    active_name = <string>node.nodes[0].value;

                    mutate(null);

                } else if (ast.type == JSNodeType.StringLiteral) {

                    active_name = <string>ast.value;

                } else if (expr.type == JSNodeType.CallExpression) {

                    const val = expr.nodes[0].value;

                    let group_name = "";

                    if (val == "assert_group") {

                        let fn_stmt: JSNode = null, SEQUENCED = false;

                        for (const { node } of jst(expr.nodes[1], 2)) {
                            if (node.type == JSNodeType.IdentifierReference) {
                                if ((<string>node.value).toLowerCase() == "sequence") {
                                    SEQUENCED = true;
                                }
                            } if (node.type == JSNodeType.StringLiteral)
                                group_name = <string>node.value;
                            else if (
                                node.type == JSNodeType.FunctionExpression
                                || node.type == JSNodeType.ArrowFunction
                            ) {
                                if (
                                    node.type == JSNodeType.FunctionExpression
                                    && node.nodes[0]
                                ) node.nodes[0] = null;

                                fn_stmt = node;
                            }
                        }
                        if (fn_stmt) {

                            const prop = compileRawTestRigs(
                                fn_stmt.type == JSNodeType.ArrowFunction ? fn_stmt.nodes[1] : fn_stmt,
                                report,
                                imports,
                                SEQUENCED
                            );

                            if (SEQUENCED) {
                                //Create a sequenced test rig   

                                if (prop.stmt.type == JSNodeType.FunctionExpression)
                                    prop.stmt.nodes = prop.stmt.nodes.slice(-1)[0].nodes;

                                prop.stmt.type = JSNodeType.Script;

                                const imports = new Set(prop.raw_rigs.flatMap(r => [...r.import_names.values()]));

                                prop.required_references = new cUnion(imports, prop.required_references);

                                const pending = <{ rig: RawTestRig, data: StatementProp, offset: number; }>{

                                    rig: {
                                        type: "SEQUENCE",
                                        name: group_name,
                                        index: 0,
                                        RUN: prop.raw_rigs.some(r => r.RUN),
                                        SOLO: prop.raw_rigs.some(r => r.SOLO),
                                        INSPECT: prop.raw_rigs.some(r => r.INSPECT),
                                        IS_ASYNC: prop.raw_rigs.some(r => r.IS_ASYNC),
                                        imports: [],
                                        import_names: imports,
                                        test_maps: prop.raw_rigs.map(compileSequencedTests),
                                        pos: prop.stmt.pos,
                                        ast: prop.stmt,
                                        expression: null
                                    },

                                    data: prop,

                                    offset: statements.length
                                };

                                tests.push(pending);

                            } else {

                                const pending_test = prop.raw_rigs.map(r => {
                                    if (group_name)
                                        r.name = group_name + "-->" + r.name;
                                    return r;
                                }).map(r => mapRig(r, prop, statements.length));

                                tests.push(...pending_test);
                            }
                        }

                        mutate(null);

                    } else {

                        const prop = compileRawTestRigs(node, report, imports, false);

                        statements.push(prop);

                        glbl_ref = setGlobalRef(prop, glbl_ref);
                        glbl_decl = setGlobalDecl(prop, glbl_decl);

                        prop.FORCE_USE = true;
                    }

                } else {

                    const prop = compileRawTestRigs(
                        node,
                        report,
                        imports,
                        false
                    );

                    glbl_ref = setGlobalRef(prop, glbl_ref);

                    statements.push(prop);
                }

                skip();
            } break;

            case JSNodeType.FunctionDeclaration:
            case JSNodeType.FunctionExpression:
            case JSNodeType.BlockStatement: {

                const prop = compileRawTestRigs(node, report, imports);

                glbl_ref = setGlobalRef(prop, glbl_ref);
                glbl_decl = setGlobalDecl(prop, glbl_decl);

                if (node.type == JSNodeType.BlockStatement) {
                    const pending_test = prop.raw_rigs
                        .map(r => mapRig(r, prop, statements.length));
                    tests.push(...pending_test);
                }

                if (prop.stmt.nodes.length > 0) {

                    AWAIT = prop.AWAIT || AWAIT;

                    if (node.type != JSNodeType.BlockStatement) {
                        declarations.push(prop);
                    } else {
                        statements.push(prop);
                    }
                }
                skip();
            } break;

            case JSNodeType.ArrowFunction: {

                const prop = compileRawTestRigs(node, report, imports);

                glbl_ref = setGlobalRef(prop, glbl_ref);
                glbl_decl = setGlobalDecl(prop, glbl_decl);

                AWAIT = prop.AWAIT || AWAIT;

                skip();
            } break;

            case JSNodeType.LexicalDeclaration:
                for (const { node: bdg } of traverse(node, "nodes", 2)
                    .skipRoot()
                    .filter("type", JSNodeType.IdentifierBinding)
                ) glbl_decl.add(id(bdg));

            default: {
                if (node.type & JSNodeClass.STATEMENT) {
                    //Extract IdentifierReferences and IdentifierAssignments 
                    // and append to the statement scope.
                    const prop = compileRawTestRigs(node, report, imports);

                    AWAIT = prop.AWAIT || AWAIT;

                    glbl_ref = setGlobalRef(prop, glbl_ref);
                    glbl_decl = setGlobalDecl(prop, glbl_decl);

                    if (prop.stmt?.nodes?.length > 0)
                        statements.push(prop);

                    skip();
                }
            } break;
        }
    }

    for (const decl of declarations) {
        if (decl.required_references.size > 0) {
            if (decl.declared_variables.size > 0)
                glbl_ref = new cDiff(new cUnion(glbl_ref, decl.required_references), decl.declared_variables);
            else
                glbl_ref = new cUnion(glbl_ref, decl.required_references);
        }
    }

    const
        declared_variables = <Set<string>>glbl_decl,
        required_references = new cDiff(glbl_ref, glbl_decl),
        rigs = [];

    for (const { rig, offset, data } of tests) {

        const { stmts, imports } = gatherStatementsAndDeclarations(data, offset, statements, declarations);
        //*
        rig.ast = <JSNode>{
            type: JSNodeType.Script,
            nodes: [
                ...stmts,
                rig.ast
            ],
            pos: ast.pos
        };

        //*/
        // rig.ast.nodes.unshift(...stmts);
        //  console.log(console.log(rig.ast));

        rig.import_names = imports;

        rigs.push(rig);
    }

    return {
        stmt: ast,
        declared_variables,
        required_references,
        FORCE_USE: false,
        raw_rigs: rigs,
        AWAIT
    };

    function mapRig(rig: RawTestRig, s: StatementProp, offset: number): { rig: RawTestRig; data: StatementProp; offset: number; } {
        return <RigCase>{ rig, data: Object.assign(s, { b: true, required_references: new cUnion(s.required_references, rig.import_names) }), offset };
    }
}
function setGlobalDecl(prop: StatementProp, glbl_decl: cSet | Set<string> | cUnion) {
    if (prop.declared_variables.size > 0)
        glbl_decl = new cUnion(glbl_decl, prop.declared_variables);
    return glbl_decl;
}

function setGlobalRef(prop: StatementProp, glbl_ref: cSet | Set<string> | cUnion) {

    if (prop.required_references.size > 0) {

        const ref = (prop.declared_variables.size > 0)
            ? new cDiff(prop.required_references, prop.declared_variables)
            : prop.required_references;

        return new cUnion(glbl_ref, ref);
    }

    return glbl_ref;
}
