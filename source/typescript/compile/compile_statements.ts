import { traverse } from "@candlefw/conflagrate";
import { JSNode, JSNodeClass, JSNodeType, tools, stmt } from "@candlefw/js";

import { ImportModule } from "../types/imports.js";
import { AssertionSite } from "../types/assertion_site.js";

import { Reporter } from "../test.js";
import { compileImport } from "./compile_import.js";
import { compileAssertionSite } from "./assertion_site/compile_assertion_site.js";
import { parseAssertionSiteArguments } from "./assertion_site/parse_assertion_site_args.js";
import { StatementProp } from "../types/statement_props";
import { compileStatementsAndDeclarations } from "./compile_statements_and_declarations.js";
import { closureSet, setUnion, setDiff } from "../utilities/sets.js";

type TestSite = {
    rig: AssertionSite;
    data: StatementProp;
    offset: number;
};

export type CompileRawTestRigsOptions = {
    ast: JSNode;
    report: Reporter;
    sequence_offset: number;
    glbl_decl: closureSet | setUnion | setDiff | Set<string>;
    glbl_ref: closureSet | setUnion | Set<string>;
    test_sites: TestSite[],
    imports: ImportModule[],
    statements: StatementProp[];
    declarations: StatementProp[];
    AWAIT: boolean;
    FORCE_USE: boolean;
};
export type RawRigs = Array<{ rig: AssertionSite, import_names: Set<string>; }>;
export const jst = (node: JSNode, depth?: number) => traverse(node, "nodes", depth);

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
 */
/**
 * Generates a graph accessible symbols from any givin line within a 
 * source file.
 */
// Only top level assertion sites can be made discrete. Any assertion site within
// function or method will be an active captive of any top level assertion site 
// that depends on statements that contain the captive assertion site. 
export function compileRawTestRigs(
    AST: JSNode,
    Report: Reporter,
    Imports: ImportModule[],
    LEAVE_ASSERTION_SITE = false,
    OUTER_SEQUENCED = false,
    Sequence_Offset = 0,
): StatementProp {

    const options = createCompilerOptions(AST, Report, Sequence_Offset, Imports);

    captureFunctionParameterNames(options);

    walkJSNodeTree(options, LEAVE_ASSERTION_SITE, OUTER_SEQUENCED);

    return compileRigsFromDeclarationsAndStatementsAndTestSites(options);
}

function compileRigsFromDeclarationsAndStatementsAndTestSites({
    ast,
    test_sites: tests,
    statements,
    declarations,
    AWAIT,
    glbl_ref,
    glbl_decl
}: CompileRawTestRigsOptions) {

    for (const decl of declarations) {
        if (decl.required_references.size > 0) {
            if (decl.declared_variables.size > 0)
                glbl_ref = new setDiff(new setUnion(glbl_ref, decl.required_references), decl.declared_variables);
            else
                glbl_ref = new setUnion(glbl_ref, decl.required_references);
        }
    }

    const
        declared_variables = <Set<string>>glbl_decl,
        required_references = new setDiff(glbl_ref, glbl_decl),
        rigs = [];

    for (const { rig, offset, data } of tests) {

        const { stmts, imports } = compileStatementsAndDeclarations(data, offset, statements, declarations);
        //*
        rig.ast = <JSNode>{
            type: JSNodeType.Script,
            nodes: [
                ...stmts,
                ...(rig.ast.type == JSNodeType.Script ?
                    rig.ast.nodes :
                    [rig.ast])
            ],
            pos: ast.pos
        };

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
}


function walkJSNodeTree(options: CompileRawTestRigsOptions, LEAVE_ASSERTION_SITE: boolean, OUTER_SEQUENCED: boolean) {

    for (let { node, meta: { skip, mutate } } of jst(options.ast)
        .skipRoot()
        .makeSkippable()
        .makeMutable()) {
        options.FORCE_USE = false;

        switch (node.type) {

            case JSNodeType.FormalParameters: continue;

            case JSNodeType.ImportDeclaration: compileImport(node, options); skip(); break;

            case JSNodeType.IdentifierBinding: if (id(node))
                options.glbl_decl.add(id(node)); break;

            case JSNodeType.IdentifierReference: if (id(node))
                options.glbl_ref.add(id(node)); break;

            case JSNodeType.AwaitExpression: options.AWAIT = true; break;

            case JSNodeType.ExpressionStatement:
                compileExpressionStatement(
                    options,
                    node,
                    LEAVE_ASSERTION_SITE,
                    OUTER_SEQUENCED,
                    mutate
                );
                skip();
                break;

            case JSNodeType.ForOfStatement:
            case JSNodeType.ForInStatement:
            case JSNodeType.DoStatement:
            case JSNodeType.ForStatement:
            case JSNodeType.WhileStatement:
                compileLoopingStatement(options, node);
                skip();
                break;

            case JSNodeType.FunctionDeclaration:
            case JSNodeType.FunctionExpression:
            case JSNodeType.BlockStatement:
                compileClosureStatement(options, node);
                skip();
                break;

            case JSNodeType.ArrowFunction:
                compileArrowFunction(options, node);
                skip();
                break;

            case JSNodeType.LexicalDeclaration:
                for (const { node: bdg } of traverse(node, "nodes", 2)
                    .skipRoot()
                    .filter("type", JSNodeType.IdentifierBinding))
                    options.glbl_decl.add(id(bdg));

            default:
                if (node.type & JSNodeClass.STATEMENT) {
                    compileMiscellaneous(options, node);
                    skip();
                }
                break;
        }
    }
}

function createCompilerOptions(AST: JSNode, Report: Reporter, Sequence_Offset: number, Imports: ImportModule[]): CompileRawTestRigsOptions {
    return {
        ast: AST,
        report: Report,
        sequence_offset: Sequence_Offset,
        glbl_decl: new Set,
        glbl_ref: new Set,
        test_sites: [],
        imports: Imports,
        statements: [],
        declarations: [],
        AWAIT: false,
        FORCE_USE: false
    };
}

function captureFunctionParameterNames(options: CompileRawTestRigsOptions) {

    const { ast } = options;

    if (ast.type == JSNodeType.FunctionDeclaration
        ||
        ast.type == JSNodeType.FunctionExpression
        ||
        ast.type == JSNodeType.ArrowFunction) {
        if (ast.type !== JSNodeType.ArrowFunction) {

            const [id_node] = ast.nodes;

            if (id_node)
                options.glbl_decl.add(id(id_node));
        }
    }
}

function compileExpressionStatement(
    options: CompileRawTestRigsOptions,
    node: JSNode,
    LEAVE_ASSERTION_SITE: boolean,
    OUTER_SEQUENCED: boolean,
    mutate: (replacement_node: JSNode) => void
) {
    const {
        imports,
        test_sites,
        report,
        statements,
        sequence_offset,
    } = options;

    let [expr] = node.nodes;

    if (node.nodes[0].type == JSNodeType.AwaitExpression) {
        options.AWAIT = true;
        expr = expr.nodes[0];
    }

    if (isExprStmtAssertionSite(node)) {

        expr.nodes[0].value = ""; // Forcefully delete assert name

        const
            rig = compileAssertionSite(expr, report, test_sites.length + sequence_offset),
            data = compileRawTestRigs(
                expr,
                report,
                imports,
                false,
            );

        if (LEAVE_ASSERTION_SITE) {
            for (const ref of data.required_references.values())
                options.glbl_ref.add(ref);

            mutate(rig.ast);
        } else
            mutate(null);

        // Forcefully remove assert name to prevent it being used
        // as a reference lookup
        expr.nodes[0].value = "";

        const pending = { rig, data, offset: statements.length };

        test_sites.push(pending);

    } else if (expr.type == JSNodeType.CallExpression) {

        const val = expr.nodes[0].value;

        if (val == "assert_group") {

            let fn_stmt: JSNode = null;

            let { SEQUENCED, BROWSER, SOLO, timeout_limit, assertion_expr: node, name }
                = parseAssertionSiteArguments(expr),
                group_name = name;

            if (node.type == JSNodeType.FunctionExpression || node.type == JSNodeType.ArrowFunction) {
                if (node.type == JSNodeType.FunctionExpression && node.nodes[0])
                    node.nodes[0] = null;
                fn_stmt = node;
            }

            if (fn_stmt) {

                if (SEQUENCED || OUTER_SEQUENCED) {

                    //Create a sequenced test rig  
                    if (OUTER_SEQUENCED) {

                        const prop = compileRawTestRigs(fn_stmt.nodes.slice().pop(), report, imports, true, true, test_sites.length + sequence_offset);
                        const imports_ = new Set(prop.raw_rigs.flatMap(r => [...r.import_names.values()]));

                        prop.required_references = new setUnion(imports_, prop.required_references);

                        for (const rig of prop.raw_rigs) {

                            if (group_name) rig.name = group_name + "-->" + rig.name;

                            rig.BROWSER = BROWSER || rig.BROWSER;

                            rig.SOLO = SOLO || rig.SOLO;

                            rig.ast = replaceFirstBlockContentWithNodes(node, rig.ast);

                            test_sites.push(repackageRawTestRig(rig, prop, statements.length));
                        }

                        statements.push(prop);

                        mutate(prop.stmt);
                    } else {


                        const prop = compileRawTestRigs(
                            fn_stmt.type == JSNodeType.ArrowFunction ? fn_stmt.nodes[1] : fn_stmt,
                            report,
                            imports,
                            true,
                            true
                        );

                        if (prop.stmt.type == JSNodeType.FunctionExpression)
                            prop.stmt.nodes = prop.stmt.nodes.slice(-1)[0].nodes;

                        prop.stmt.type = JSNodeType.Script;

                        const imports_ = new Set(prop.raw_rigs.flatMap(r => [...r.import_names.values()]));

                        prop.required_references = new setUnion(imports_, prop.required_references);

                        const pending = <{ rig: AssertionSite, data: StatementProp, offset: number; }>{

                            rig: <AssertionSite>{
                                type: "SEQUENCE",
                                name: group_name,
                                index: 0,
                                RUN: prop.raw_rigs.some(r => r.RUN),
                                SOLO: prop.raw_rigs.some(r => r.SOLO),
                                INSPECT: prop.raw_rigs.some(r => r.INSPECT),
                                IS_ASYNC: prop.raw_rigs.some(r => r.IS_ASYNC),
                                BROWSER: BROWSER || prop.raw_rigs.some(r => r.BROWSER),
                                imports: [],
                                import_names: imports_,
                                test_maps: prop.raw_rigs.map(compileSequencedTests),
                                pos: prop.stmt.pos,
                                ast: prop.stmt,
                                expression: null,
                                timeout_limit
                            },

                            data: prop,

                            offset: statements.length
                        };

                        test_sites.push(pending);

                        mutate(null);

                    }
                } else {


                    const prop = compileRawTestRigs(
                        fn_stmt.type == JSNodeType.ArrowFunction ? fn_stmt.nodes[1] : fn_stmt,
                        report,
                        imports,
                        false,
                    );

                    for (const rig of prop.raw_rigs) {

                        if (group_name) rig.name = group_name + "-->" + rig.name;

                        rig.BROWSER = BROWSER || rig.BROWSER;

                        rig.ast = replaceFirstBlockContentWithNodes(node, rig.ast);

                        test_sites.push(repackageRawTestRig(rig, prop, statements.length));
                    }

                    mutate(null);

                }
            }

        } else {

            const prop = compileRawTestRigs(node, report, imports, false);

            prop.FORCE_USE = true;

            combinePropRefsAndDecl(options, prop);

            statements.push(prop);

        }

    } else {

        const prop = compileRawTestRigs(node, report, imports, false);

        options.glbl_ref = setGlobalRef(prop, options.glbl_ref);

        statements.push(prop);
    }

    options.AWAIT;
}

function combinePropRefsAndDecl(options: CompileRawTestRigsOptions, prop: StatementProp) {
    options.glbl_ref = setGlobalRef(prop, options.glbl_ref);
    options.glbl_decl = setGlobalDecl(prop, options.glbl_decl);
}

function compileMiscellaneous(options: CompileRawTestRigsOptions, node: JSNode) {

    const { imports, test_sites: tests, report, statements } = options;

    if (node.type == JSNodeType.LabeledStatement && node.nodes[0].value == "keep")
        options.FORCE_USE = true;

    if (node.type & JSNodeClass.STATEMENT) {
        // Extract IdentifierReferences and IdentifierAssignments 
        // and append to the statement scope.
        const
            prop = compileRawTestRigs(node, report, imports),
            pending_test = prop.raw_rigs
                .map(r => repackageRawTestRig(r, prop, statements.length));

        tests.push(...pending_test);

        options.AWAIT = prop.AWAIT || options.AWAIT;

        combinePropRefsAndDecl(options, prop);

        prop.FORCE_USE = options.FORCE_USE || prop.FORCE_USE;

        if (prop.stmt?.nodes?.length >= 0)
            statements.push(prop);
    }
}



function compileArrowFunction(options: CompileRawTestRigsOptions, node: JSNode) {
    const
        { imports, report } = options,
        prop = compileRawTestRigs(node, report, imports);

    options.glbl_ref = setGlobalRef(prop, options.glbl_ref);
    options.glbl_decl = setGlobalDecl(prop, options.glbl_decl);
    options.AWAIT = prop.AWAIT || options.AWAIT;
}

function compileLoopingStatement(options: CompileRawTestRigsOptions, node: JSNode) {

    const
        { imports, test_sites: tests, report, statements } = options,
        block = jst(node, 2).filter("type", JSNodeType.BlockStatement).run(_ => _)[0];

    if (block) {

        const prop = compileRawTestRigs(block, report, imports);

        combinePropRefsAndDecl(options, prop);

        for (const rig of prop.raw_rigs) {

            rig.ast = replaceFirstBlockContentWithNodes(node, rig.ast);

            tests.push(repackageRawTestRig(rig, prop, statements.length));
        }

        if (prop.stmt.nodes.length > 0) {
            options.AWAIT = prop.AWAIT || options.AWAIT;
            statements.push(prop);
        }
    }
}

function compileClosureStatement(options: CompileRawTestRigsOptions, node: JSNode) {

    const
        { imports, test_sites: tests, report, statements, declarations } = options,
        prop = compileRawTestRigs(node, report, imports);

    combinePropRefsAndDecl(options, prop);

    for (const rig of prop.raw_rigs)
        tests.push(repackageRawTestRig(rig, prop, statements.length));

    if (prop.stmt.nodes.length > 0) {

        options.AWAIT = prop.AWAIT || options.AWAIT;

        if (node.type != JSNodeType.BlockStatement)
            declarations.push(prop);
        else
            statements.push(prop);
    }
}

function repackageRawTestRig(rig: AssertionSite, s: StatementProp, offset: number): { rig: AssertionSite; data: StatementProp; offset: number; } {
    return <TestSite>{ rig, data: Object.assign(s, { b: true, required_references: new setUnion(s.required_references, rig.import_names) }), offset };
}

function setGlobalDecl(prop: StatementProp, glbl_decl: closureSet | Set<string> | setUnion) {
    if (prop.declared_variables.size > 0)
        glbl_decl = new setUnion(glbl_decl, prop.declared_variables);
    return glbl_decl;
}

function setGlobalRef(prop: StatementProp, glbl_ref: closureSet | Set<string> | setUnion) {

    if (prop.required_references.size > 0) {

        const ref = (prop.declared_variables.size > 0)
            ? new setDiff(prop.required_references, prop.declared_variables)
            : prop.required_references;

        return new setUnion(glbl_ref, ref);
    }

    return glbl_ref;
}

function isExprStmtAssertionSite(stmt: JSNode): boolean {
    if (
        stmt.type == JSNodeType.ExpressionStatement
        && stmt.nodes[0].type == JSNodeType.CallExpression
        && id(stmt.nodes[0].nodes[0]) == "assert"
    )
        return true;

    return false;
}

function compileSequencedTests({ INSPECT, SOLO, RUN, name, index, pos, ast }, i) {

    return { INSPECT, SOLO, RUN: true, name, index: i, pos };
}

const { getIdentifierName: id } = tools;

function replaceFirstBlockContentWithNodes(contains_block: JSNode, ...replacement_nodes: JSNode[]) {
    const receiver = { ast: null };

    for (const { node, meta } of jst(contains_block)
        .filter("type", JSNodeType.BlockStatement)
        .makeReplaceable()
        .extract(receiver)
    ) {
        const new_block = stmt("{}");
        new_block.nodes.push(...replacement_nodes);
        meta.replace(new_block);
    }

    return receiver.ast;
};