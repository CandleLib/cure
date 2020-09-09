import { traverse } from "@candlefw/conflagrate";
import { JSNode, JSNodeClass, JSNodeType, tools, renderCompressed, stmt as parse_statement } from "@candlefw/js";

import { ImportModule } from "../types/import_module.js";
import { RawTestRig } from "../types/raw_test.js";

import { Reporter } from "../main.js";
import { Scope, createCompileScope, SequenceData } from "./compile_statements_old.js";
import { compileImport } from "./compile_import.js";
import { buildAssertionSiteNode } from "./build_assertion_site_rig.js";
import { StatementProp } from "./StatementProp";


export const jst = (node: JSNode, depth?: number) => traverse(node, "nodes", depth);

export type RawRigs = Array<{ rig: RawTestRig, import_names: Set<string>; }>;

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
    reporter: Reporter,
    imports: ImportModule[],
    scope: Scope = createCompileScope(ast, null),
    suite_names: string[] = [],
    sequence_data: SequenceData = null,
): RawRigs {
    const
        tests: { rig: RawTestRig, data: StatementProp, offset: number; }[] = [],
        statements: StatementProp[] = [],

        //Only function declarations are hoisted.
        declarations: StatementProp[] = [];

    let active_name = "", SOLO = false, SKIP = false;

    main: for (let { node, meta: { skip } } of jst(ast, 2)
        .skipRoot()
        .makeSkippable()
        .bitFilter("type", JSNodeClass.STATEMENT)
    ) {
        switch (node.type) {

            case JSNodeType.ImportDeclaration: { compileImport(node, imports); skip(); } break;

            case JSNodeType.LabeledStatement: {

                const
                    prop = processStatement(node, reporter),
                    [label] = node.nodes;

                switch ((<string>label.value).toLowerCase()) {
                    case "sequence":
                        const pending = <{ rig: RawTestRig, data: StatementProp, offset: number; }>{
                            rig: {
                                type: "SEQUENCE",
                                index: 0,
                                name: "",
                                ast: prop.stmt,
                                RUN: true,
                                SOLO: false,
                                INSPECT: false,
                                IS_ASYNC: true,
                                test_maps: prop.raw_rigs.map(({ INSPECT, SOLO, RUN, name, index, pos, ast }, i) => (
                                    ast.nodes[0] = parse_statement(`$harness.test_index = ${i}; `),
                                    { INSPECT, SOLO, RUN: true, name, index: i, pos })
                                ),
                                imports: [],
                            },
                            data: prop,
                            offset: statements.length
                        };

                        tests.push(pending);
                        break;
                    default:
                        statements.push(prop);
                }

            } break;

            case JSNodeType.ExpressionStatement: {

                //Pure call expression are all ways assumed to have side effects that must be included
                const [expr] = node.nodes;

                if (isExprStmtAssertionSite(node)) {

                    // Forcefully remove assert name to prevent it being used
                    // as a reference lookup
                    expr.nodes[0].value = "";

                    const pending = {
                        rig: buildAssertionSiteNode(node.nodes[0], reporter),
                        data: processStatement(node.nodes[0], reporter),
                        offset: statements.length
                    };

                    pending.rig.name = pending.rig.name
                        || active_name
                        || renderCompressed(pending.rig.expression);

                    tests.push(pending);

                    active_name = "";

                } else if (expr.type == JSNodeType.StringLiteral) {

                    active_name = <string>expr.value;

                } else if (expr.type == JSNodeType.CallExpression) {

                    const prop = processStatement(node, reporter);

                    prop.FORCE_USE = true;

                    statements.push(prop);

                } else {

                    const prop = processStatement(node, reporter);

                    statements.push(prop);
                }
            } break;

            case JSNodeType.BlockStatement:
                break;

            case JSNodeType.FunctionDeclaration: {
                //Hoist this declaration
                const prop = processStatement(node, reporter);
                declarations.push(prop);
            } break;

            default: {

                //Extract IdentifierReferences and IdentifierAssignments 
                // and append to the statement scope.
                const prop = processStatement(node, reporter);
                statements.push(prop);
            } break;
        }
    }

    const rigs = [];

    for (const { rig, offset, data } of tests) {
        const { stmts, imports } = gatherStatementsAndDeclarations(data, offset, statements, declarations);

        if (rig.type == "DISCRETE") {
            rig.ast = <JSNode>{
                type: JSNodeType.Script,
                nodes: [
                    ...stmts,
                    rig.ast
                ],
                pos: ast.pos
            };
        } else {
            rig.ast = <JSNode>{
                type: JSNodeType.Script,
                nodes: [
                    ...stmts,
                    rig.ast
                ],
                pos: ast.pos
            };
        }


        rigs.push({ rig, import_names: imports });
    }

    return rigs;
}

function gatherStatementsAndDeclarations(
    refs: StatementProp,
    offset: number,
    statements: StatementProp[] = [],
    //Only function declarations are hoisted.
    declarations: StatementProp[] = []
) {

    const
        active_refs = new Set(refs.required_references.values()),
        declared_refs: Set<string> = new Set(),
        stmts: JSNode[] = [];

    for (let i = offset - 1; i > -1; i--) {

        const stmt = statements[i];

        let use = !!stmt.FORCE_USE;

        if (!use)
            for (const ref of active_refs.values()) {
                if (
                    stmt.required_references.has(ref)
                    || stmt.declared_variables.has(ref)
                ) {
                    use = true;
                    break;
                }
            }

        if (use) stmts.push(stmt.stmt);

        for (const ref of stmt.required_references.values())
            active_refs.add(ref);

        for (const ref of stmt.declared_variables.values()) {
            declared_refs.add(ref);
            active_refs.delete(ref);
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

        for (const ref of declaration.required_references.values())
            active_refs.add(ref);

        for (const ref of declaration.declared_variables.values())
            declared_refs.add(ref);

        if (use) stmts.push(declaration.stmt);
    }

    for (const ref of declared_refs.values())
        active_refs.delete(ref);

    return { stmts: stmts.reverse(), imports: active_refs };
}

function processStatement(
    stmt: JSNode,
    report: Reporter,
    AT_ROOT = true,
    lex_decl: ClosureSet | Set<string> = new Set,
    local_decl: ClosureSet | Set<string> = new Set,
    glbl_decl: ClosureSet | Set<string> = local_decl,
    glbl_ref: Set<string> = new Set,
): StatementProp {

    let AWAIT = false,
        raw_rigs = [],
        active_name = "";

    if (stmt.type == JSNodeType.FunctionDeclaration ||
        stmt.type == JSNodeType.FunctionExpression) {
        const
            [id_node] = stmt.nodes,
            value = id(id_node);
        if (
            !local_decl.has(value)
            && !lex_decl.has(value)
        ) { local_decl.add(value); }

        local_decl = new ClosureSet(local_decl);

        AT_ROOT = false;
    }

    for (const { node, meta } of traverse(stmt, "nodes")
        .skipRoot()
        .makeSkippable()
        .makeMutable()
    ) {

        switch (node.type) {

            case JSNodeType.ExpressionStatement: {

                if (isExprStmtAssertionSite(node)) {

                    node.nodes[0].nodes[0].value = ""; // Forcefully delete assert name

                    const rig = buildAssertionSiteNode(node.nodes[0], report);

                    rig.name = rig.name || active_name || renderCompressed(rig.expression);

                    raw_rigs.push(rig);

                    rig.ast = {
                        type: JSNodeType.BlockStatement,
                        nodes: [
                            parse_statement(`$harness.test_index = ${raw_rigs.length}; `),
                            rig.ast
                        ],
                        pos: node.pos
                    };

                    meta.mutate(rig.ast);

                    meta.skip(80);

                    active_name = "";

                } else if (node.nodes[0].type == JSNodeType.StringLiteral) {
                    active_name = <string>node.nodes[0].value;
                    meta.mutate(null);
                }

            } break;

            case JSNodeType.FormalParameters: continue;

            case JSNodeType.LexicalDeclaration:
                for (const { node: bdg } of traverse(node, "nodes", 2)
                    .skipRoot()
                    .filter("type", JSNodeType.IdentifierBinding)
                ) {
                    lex_decl.add(id(bdg));
                }
                break;
            case JSNodeType.FunctionDeclaration:
            case JSNodeType.FunctionExpression: {

                const { AWAIT: SHOULD_AWAIT, raw_rigs: r } = processStatement(
                    node,
                    report,
                    false,
                    new ClosureSet(lex_decl),
                    local_decl,
                    glbl_decl,
                    glbl_ref
                );
                raw_rigs.push(...r);
                meta.skip(4);
                AWAIT = SHOULD_AWAIT || AWAIT;
            } break;
            case JSNodeType.ArrowFunction: {

                const { AWAIT: SHOULD_AWAIT, raw_rigs: r } = processStatement(
                    node,
                    report,
                    false,
                    new ClosureSet(lex_decl),
                    new ClosureSet(local_decl),
                    glbl_decl,
                    glbl_ref
                );
                raw_rigs.push(...r);
                meta.skip(4);
                AWAIT = SHOULD_AWAIT || AWAIT;
            } break;

            case JSNodeType.BlockStatement: {
                const { AWAIT: SHOULD_AWAIT, raw_rigs: r } = processStatement(node,
                    report,
                    AT_ROOT,
                    new ClosureSet(lex_decl),
                    local_decl,
                    glbl_decl,
                    glbl_ref
                );
                raw_rigs.push(...r);
                AWAIT = SHOULD_AWAIT || AWAIT;
            } break;

            case JSNodeType.AwaitExpression: {
                AWAIT = true;
            } break;

            case JSNodeType.IdentifierBinding: {
                const value = id(node);
                if (!local_decl.has(value) && !lex_decl.has(value))
                    (AT_ROOT ? glbl_decl : local_decl).add(value);
            } break;

            case JSNodeType.IdentifierReference: {
                const value = id(node);

                if (
                    value &&
                    !local_decl.has(value)
                    && !lex_decl.has(value)
                ) {
                    glbl_ref.add(value);
                }
            } break;

            default: break;
        }
    }


    return {
        stmt,
        declared_variables: <Set<string>>glbl_decl,
        required_references: glbl_ref,
        FORCE_USE: false,
        raw_rigs,
        AWAIT
    };
}

class ClosureSet {
    outer_set: Set<string> | ClosureSet;
    private inner_set: Set<string>;
    constructor(outer_set: Set<string> | ClosureSet) {
        this.outer_set = outer_set;
        this.inner_set = new Set;
    }
    has(str) {
        if (!this.inner_set.has(str)) return !!this.outer_set?.has(str);
        return true;

    }
    add(str) {
        this.inner_set.add(str);
        return this;
    }
}

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
