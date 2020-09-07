import { traverse } from "@candlefw/conflagrate";
import { JSNode, JSNodeClass, JSNodeTypeLU as $, stmt, renderWithFormatting, ext, renderCompressed, JSNodeTypeLU } from "@candlefw/js";

import { AssertionSite, AssertionSiteSequence } from "../types/assertion_site.js";
import { ImportModule } from "../types/import_module.js";
import { RawTestRig } from "../types/raw_test.js";
import { TestMap } from "../types/test_map.js";

import { Reporter } from "../main.js";
import { compileAssertionSite } from "./assertion_site/compile_assertion_site.js";
import { buildAssertionSiteAst, getClosureBody } from "./assertion_site/build_assertion_site_ast.js";
import { compileImport } from "./compile_import.js";
import { format_rules } from "../utilities/format_rules.js";

export const jst = (node: JSNode, depth?: number) => traverse(node, "nodes", depth);

export interface Scope {
    AWAIT: boolean;
    scope: Scope,
    type: string,
    inputs: Set<string>,
    outputs: Set<string>,
    lex_decl: Set<string>,
    decl: Set<string>,
    root: JSNode,
    prev_symbol: Map<string, Scope>,
    links: Scope[],
    id: bigint,
    linked_flags: bigint;
}

export function createCompileScope(node, scope): Scope {
    return <Scope>{
        AWAIT: false,
        scope,
        type: $[node.type],
        id: 1n,
        inputs: <Set<string>>new Set,
        outputs: <Set<string>>new Set,
        lex_decl: <Set<string>>new Set,
        decl: <Set<string>>new Set,
        root: node,
        prev_symbol: new Map,
        links: [],
        linked_flags: 0n
    };
}

export function getRigName(suite_names: string[], optional_name: string = "undefined") {

    const
        local_name = suite_names.pop(),
        name = suite_names.slice().filter(s => s !== "#").join("-->")
            + ((suite_names.length > 0) ? "-->" : "")
            + (local_name != "#" && local_name || optional_name);

    return name;
}

export type SequenceData = { body: JSNode[], test_maps: TestMap[]; };

function createSequenceData(): SequenceData {
    return { body: <JSNode[]>[], test_maps: <TestMap[]>[] };
}


export function compileStatementsNewer(
    ast: JSNode,
    reporter: Reporter,
    imports: ImportModule[],
    scope: Scope = createCompileScope(ast, null),
    suite_names: string[] = [],
    sequence_data: SequenceData = null
) {
    const test_rigs = [];

    const new_stmt = createCompileScope(ast, scope);

    compileClosureStatement(new_stmt, ast, scope, reporter, imports, suite_names, test_rigs, false, false, false);

    return test_rigs;
}

/**[API]
 * Generates test rigs from all code (ATM - anyways)
 * within a file and assertion sites from call expression
 * statements that have one of these signatures:
 * - `assert( expression );`
 * - `ass( expression );`
 * - `a( expression );`
 * 
 * Inspection and Solo can be configured by
 * using `inspect` and `solo` ( or `i` and `s`) 
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
export function compileStatementsNew(
    ast: JSNode,
    reporter: Reporter,
    imports: ImportModule[],
    scope: Scope = createCompileScope(ast, null),
    suite_names: string[] = [],
    sequence_data: SequenceData = null
): Array<AssertionSite | AssertionSiteSequence> {

    if (!ast) return [];

    let current_stmt = null, index = 1n;

    const { inputs, outputs, lex_decl, decl, prev_symbol } = scope, test_rigs = [];

    if (ast.type & JSNodeClass.IDENTIFIER) {
        compileIdentifier(ast, ast, lex_decl, decl, outputs, inputs);
    }


    main: for (let { node, meta: { skip, mutate, depth } } of jst(ast)
        .skipRoot()
        .makeSkippable()
        .makeMutable()
    ) {
        const { type } = node;

        if (type == $.AwaitExpression) {

            scope.AWAIT = true;

        }

        if (type & JSNodeClass.IDENTIFIER) {

            compileIdentifier(node, ast, lex_decl, decl, outputs, inputs);

        } else if (depth < 2 && type & JSNodeClass.STATEMENT) {

            let new_stmt: Scope = null, SOLO = false, SKIP = false, INSPECT = false, SKIP_NODE = false;

            switch (type) {

                case $.ExportDeclaration: { mutate(null); skip(); } continue;

                case $.ImportDeclaration: { compileImport(node, imports); mutate(null); skip(); } continue;

                case $.LexicalDeclaration:

                    //extract all declared nodes 
                    new_stmt = createCompileScope(node, scope);
                    new_stmt.id = 1n << index;
                    test_rigs.push(...compileStatementsNew(node, reporter, imports, new_stmt, suite_names));

                    for (const lex of new_stmt.lex_decl.keys()) {
                        new_stmt.outputs.add(lex);
                        lex_decl.add(lex);
                        outputs.delete(lex);
                        inputs.delete(lex);
                    }

                    break;

                case $.FunctionDeclaration:

                    new_stmt = createCompileScope(node, scope);
                    new_stmt.id = 1n << index;
                    new_stmt.outputs.add(<string>node.nodes[0].value);

                    compileStatementsNew(node.nodes[1], reporter, imports, new_stmt);

                    test_rigs.push(...compileStatementsNew(node.nodes[2], reporter, imports, new_stmt, suite_names.slice()));

                    for (const lex of new_stmt.lex_decl.keys()) {
                        new_stmt.outputs.delete(lex);
                        new_stmt.inputs.delete(lex);
                    }

                    break;

                case $.BlockStatement:
                    //extract all declared nodes 
                    new_stmt = createCompileScope(node, scope);
                    new_stmt.id = 1n << index;
                    test_rigs.push(...compileStatementsNew(node, reporter, imports, new_stmt, suite_names.slice()));

                    for (const lex of new_stmt.lex_decl.keys()) {
                        new_stmt.outputs.delete(lex);
                        new_stmt.inputs.delete(lex);
                    }

                    break;

                case $.LabeledStatement: {

                    const [label] = node.nodes;
                    let IGNORE_STATEMENT = false;

                    switch ((<string>label.value).toLowerCase()) {
                        case "after_each": mutate(null); skip(); continue main;
                        case "before_each": mutate(null); skip(); continue main;
                        case "sequence": IGNORE_STATEMENT = true; break;
                        case "only": IGNORE_STATEMENT = SOLO = true; break;
                        case "skip": IGNORE_STATEMENT = SKIP = true;
                    }

                    new_stmt = createCompileScope(node, scope);

                    new_stmt.id = 1n << index;

                    compileClosureStatement(new_stmt, node, scope, reporter, imports, suite_names, test_rigs, SOLO, SKIP, INSPECT);

                    if (IGNORE_STATEMENT) {
                        skip();
                        continue;
                    }

                } break;

                case $.DoStatement:

                    new_stmt = createCompileScope(node, scope);
                    new_stmt.id = 1n << index;
                    compileStatementsNew(node.nodes[1], reporter, imports, new_stmt);
                    compileClosureStatement(new_stmt, node, scope, reporter, imports, suite_names, test_rigs, SOLO, SKIP, INSPECT);
                    break;

                case $.WhileStatement:

                    new_stmt = createCompileScope(node, scope);
                    new_stmt.id = 1n << index;
                    compileStatementsNew(node.nodes[0], reporter, imports, new_stmt);
                    compileClosureStatement(new_stmt, node, scope, reporter, imports, suite_names, test_rigs, SOLO, SKIP, INSPECT);
                    break;

                case $.ForStatement:

                    new_stmt = createCompileScope(node, scope);
                    new_stmt.id = 1n << index;
                    compileStatementsNew(node.nodes[0], reporter, imports, new_stmt);
                    compileStatementsNew(node.nodes[1], reporter, imports, new_stmt);
                    compileStatementsNew(node.nodes[2], reporter, imports, new_stmt);
                    compileClosureStatement(new_stmt, node, scope, reporter, imports, suite_names, test_rigs, SOLO, SKIP, INSPECT);
                    break;

                case $.ForInStatement:
                case $.ForOfStatement:

                    new_stmt = createCompileScope(node, scope);
                    new_stmt.id = 1n << index;

                    compileStatementsNew(node.nodes[0], reporter, imports, new_stmt);
                    compileStatementsNew(node.nodes[1], reporter, imports, new_stmt);


                    compileClosureStatement(new_stmt, node, scope, reporter, imports, suite_names, test_rigs, SOLO, SKIP, INSPECT);
                    break;

                case $.SwitchStatement:
                    new_stmt = createCompileScope(node, scope);
                    new_stmt.id = 1n << index;
                    compileStatementsNew(node.nodes[0], reporter, imports, new_stmt);
                    compileClosureStatement(new_stmt, node, scope, reporter, imports, suite_names, test_rigs, SOLO, SKIP, INSPECT);
                    break;



                case $.ExpressionStatement: {

                    const [expression] = node.nodes;

                    let assertion_expr = null;

                    if (expression.type == $.StringLiteral) {

                        if (suite_names.slice(-1)[0] == "#")
                            suite_names.pop();

                        suite_names.push(...((<string>expression.value).split(">")));

                        SKIP_NODE = true;

                    } else if (
                        expression.type == $.CallExpression
                        &&
                        expression.nodes[0].type == $.IdentifierReference
                        &&
                        ("assert").includes(<string>expression.nodes[0].value)
                        &&
                        expression.nodes[0].value[0] == "a"
                    ) {

                        SKIP_NODE = true;

                        for (const { node, meta: { index } } of jst(expression.nodes[1], 2).skipRoot()) {

                            if (node.type == $.IdentifierReference) {
                                if ((node.value == "s" && assertion_expr) || node.value == "solo") {
                                    SOLO = true; continue;
                                } else if ((node.value == "i" && assertion_expr) || node.value == "inspect") {
                                    INSPECT = true; continue;
                                } else if ((node.value == "m" && assertion_expr) || node.value == "mono") {
                                    SOLO = true; continue;
                                }
                            }

                            if (assertion_expr) throw node.pos.throw(`candidate assertion expression [${
                                renderCompressed(assertion_expr)
                                }] already passed to this function.`);

                            assertion_expr = node;
                        }

                        let AWAIT = false;

                        const assert_site_inputs: Set<string> = new Set();

                        for (const { node: { type, value } } of jst(assertion_expr)
                            .filter("type",
                                $.AwaitExpression,
                                $.IdentifierReference,
                                $.IdentifierName,
                                $.IdentifierBinding,
                                $.Identifier,
                                $.Identifier)
                        ) if (type == $.AwaitExpression) AWAIT = true; else assert_site_inputs.add(<string>value);

                        if (!assertion_expr)
                            throw expression.pos.throw(`Could not find an expression for assertion site${expression.pos.slice()}`);

                        const { ast, optional_name } = compileAssertionSite(assertion_expr, reporter),

                            name = getRigName(suite_names, optional_name);

                        suite_names.push("#");

                        /**
                         * If Sequence rig is present then compile the node into the sequence body
                         */
                        if (sequence_data) {
                            const index = sequence_data.test_maps.length;
                            sequence_data.body.push(stmt(`$harness.test_index = ${index}; `), ast);
                            sequence_data.test_maps.push(<TestMap>{ INSPECT, SOLO, RUN: !SKIP, name, index, pos: node.pos });

                            for (const var_name of assert_site_inputs.values()) {
                                if (!decl.has(var_name) && !lex_decl.has(var_name))
                                    inputs.add(var_name);
                            }

                        } else {

                            const
                                { root, body, AWAIT: OUTER_AWAIT, inputs } =
                                    buildAssertionSiteAst(scope, assert_site_inputs);

                            body.nodes.push(ast);

                            test_rigs.push({
                                rig: <RawTestRig>{
                                    type: "DISCRETE",
                                    index: 0,
                                    name,
                                    ast: root,
                                    error: null,
                                    imports: [],
                                    pos: node.pos,
                                    IS_ASYNC: OUTER_AWAIT || AWAIT || scope.AWAIT,
                                    SOLO, RUN: !SKIP, INSPECT: false
                                },
                                import_names: inputs,
                            });
                        }
                    }

                    if (SKIP_NODE) {
                        mutate(null);
                        skip();
                        continue;
                    }
                }

                default:
                    //extract all declared nodes 
                    new_stmt = createCompileScope(node, scope);
                    new_stmt.id = 1n << index;
                    test_rigs.push(...compileStatementsNew(node, reporter, imports, new_stmt, suite_names.slice()));
                    break;
            }

            for (const var_name of new_stmt.outputs.values())
                if (!lex_decl.has(var_name))
                    outputs.add(var_name);


            for (const var_name of new_stmt.inputs.values())
                if (!lex_decl.has(var_name) && !decl.has(var_name))
                    inputs.add(var_name);

            if (current_stmt && new_stmt)
                for (const var_name of new_stmt.inputs.values()) {
                    let stmt = prev_symbol.get(var_name);
                    if (stmt && !(new_stmt.linked_flags & stmt.id)) {
                        new_stmt.linked_flags |= stmt.id;
                        new_stmt.links.push(stmt, ...stmt.links);
                    }
                }

            if (new_stmt)
                for (const var_name of new_stmt.outputs.values())
                    prev_symbol.set(var_name, new_stmt);

            index++;

            current_stmt = new_stmt;

            if (sequence_data) sequence_data.body.push(node);

            skip();
        }
    }

    return test_rigs;
}

export function compileIdentifier(node: JSNode, ast: JSNode, lex_decl: Set<string>, decl: Set<string>, outputs: Set<string>, inputs: Set<string>) {

    const var_name = <string>node.value;

    switch (node.type) {

        case $.IdentifierBinding:

            if (
                ast.type == $.LexicalDeclaration
                || ast.type == $.LexicalBinding
                || ast.type == $.FunctionBody
                || ast.type == $.FormalParameters
            ) {
                lex_decl.add(var_name);
            } else {

                decl.add(var_name);
                outputs.add(var_name);
            }

            inputs.delete(var_name);
            break;

        case $.IdentifierName:
        case $.IdentifierReference:

            if (!lex_decl.has(var_name) && !decl.has(var_name))
                inputs.add(var_name);

            if (!lex_decl.has(var_name))
                outputs.add(var_name);
    }
}

export function compileClosureStatement(
    new_stmt: any,
    node: JSNode,
    scope: Scope,
    reporter: Reporter,
    imports: ImportModule[],
    suite_names: string[],
    test_rigs: any[],
    SOLO: boolean,
    SKIP: boolean,
    INSPECT: boolean
) {

    const

        { node: enclosing_node, body: closure_body, original_body } = getClosureBody(node),

        sequence_rig = createSequenceData();

    compileStatementsNew(original_body, reporter, imports, new_stmt, suite_names.slice(), sequence_rig);

    if (sequence_rig.test_maps.length > 0) {

        closure_body.nodes = sequence_rig.body;

        const { root, body, AWAIT: OUTER_AWAIT } = buildAssertionSiteAst(scope, new_stmt.inputs);

        body.nodes.push(enclosing_node);

        test_rigs.push({
            rig: <RawTestRig>{
                type: "SEQUENCE",
                index: 0,
                name: "",
                ast: root,
                error: null,
                render: renderWithFormatting(root, format_rules),
                imports: [],
                test_maps: sequence_rig.test_maps,
                pos: node.pos,
                IS_ASYNC: OUTER_AWAIT || new_stmt.AWAIT,
                SOLO, RUN: !SKIP, INSPECT
            },
            import_names: new_stmt.inputs,
        });
    }

    for (const var_name of new_stmt.lex_decl.keys()) {
        new_stmt.outputs.delete(var_name);
        new_stmt.inputs.delete(var_name);
    }

    return new_stmt;
}
