import { traverse } from "@candlefw/conflagrate";
import { JSNode, JSNodeClass, JSNodeType, tools } from "@candlefw/js";
import { AssertionSite } from "../types/assertion_site.js";
import { CompilerState } from "../types/compiler_state";
import { Globals } from "../types/globals.js";
import { ImportModule } from "../types/imports.js";
import { StatementProp } from "../types/statement_props";
import { TestSite } from "../types/test_site";
import { closureSet, setDiff, setUnion } from "../utilities/sets.js";
import { compileAssertionGroupSite, compileAssertionSite } from "./assertion_site/compile_assertion_site.js";
import { compileImport } from "./compile_import.js";
import { compileStatementsAndDeclarations } from "./compile_statements_and_declarations.js";
import { createCompilerState as createCompilerState } from "./create_compiler_state.js";
import { getFirstBlockStatement } from "./utilities/get_first_block_statement.js";
import { Is_Expression_An_Assertion_Site } from "./utilities/is_expression_assertion_site.js";
import { replaceFirstBlockContentWithNodes } from "./utilities/replace_block_statement_contents.js";
import { jst } from "./utilities/traverse_js_node.js";


export const id = tools.getIdentifierName;

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
export function compileTestsFromSourceAST(
    globals: Globals,
    AST: JSNode,
    Imports: ImportModule[],
    LEAVE_ASSERTION_SITE = false,
    OUTER_SEQUENCED = false,
): StatementProp {

    const options = createCompilerState(globals, AST, Imports);

    captureFunctionParameterNames(options);

    walkJSNodeTree(options, LEAVE_ASSERTION_SITE, OUTER_SEQUENCED);

    return compileRigsFromDeclarationsAndStatementsAndTestSites(options);
}

function compileRigsFromDeclarationsAndStatementsAndTestSites({
    ast,
    tests,
    statements,
    declarations,
    AWAIT,
    glbl_ref,
    glbl_decl
}: CompilerState) {

    const assertion_sites = [];

    for (const { assertion_site, offset, data } of tests) {

        const { stmts, imports } = compileStatementsAndDeclarations(data, offset, statements, declarations);

        assertion_site.ast = <JSNode>{
            type: JSNodeType.Script,
            nodes: [
                ...stmts,
                ...(assertion_site.ast.type == JSNodeType.Script ?
                    assertion_site.ast.nodes :
                    [assertion_site.ast])
            ],
            pos: ast.pos
        };

        assertion_site.import_names = imports;

        assertion_sites.push(assertion_site);
    }


    for (const decl of declarations) {
        if (decl.required_references.size > 0) {
            if (decl.declared_variables.size > 0)
                glbl_ref = new setDiff(new setUnion(glbl_ref, decl.required_references), decl.declared_variables);
            else
                glbl_ref = new setUnion(glbl_ref, decl.required_references);
        }
    }

    return <StatementProp>{
        stmt: ast,
        declared_variables: <Set<string>>glbl_decl,
        required_references: new setDiff(glbl_ref, glbl_decl),
        FORCE_USE: false,
        assertion_sites: assertion_sites,
        AWAIT
    };
}


function walkJSNodeTree(state: CompilerState, LEAVE_ASSERTION_SITE: boolean, OUTER_SEQUENCED: boolean) {

    for (let { node, meta: { skip, mutate } } of jst(state.ast)
        .skipRoot()
        .makeSkippable()
        .makeMutable()) {
        state.FORCE_USE = false;

        switch (node.type) {

            case JSNodeType.FormalParameters: continue;

            case JSNodeType.ImportDeclaration: compileImport(node, state); skip(); break;

            case JSNodeType.IdentifierBinding: if (id(node))
                state.glbl_decl.add(id(node)); break;

            case JSNodeType.IdentifierReference: if (id(node))
                state.glbl_ref.add(id(node)); break;

            case JSNodeType.AwaitExpression: state.AWAIT = true; break;

            case JSNodeType.ExpressionStatement:
                compileExpressionStatement(
                    state,
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
                compileLoopingStatement(state, node);
                skip();
                break;

            case JSNodeType.FunctionDeclaration:
            case JSNodeType.FunctionExpression:
            case JSNodeType.BlockStatement:
                compileClosureStatement(state, node);
                skip();
                break;

            case JSNodeType.ArrowFunction:
                compileArrowFunction(state, node);
                skip();
                break;

            case JSNodeType.LexicalDeclaration:
                for (const { node: bdg } of traverse(node, "nodes", 2)
                    .skipRoot()
                    .filter("type", JSNodeType.IdentifierBinding))
                    state.glbl_decl.add(id(bdg));

            default:
                if (node.type & JSNodeClass.STATEMENT) {
                    compileMiscellaneous(state, node);
                    skip();
                }
                break;
        }
    }
}

function captureFunctionParameterNames(state: CompilerState) {

    const { ast } = state;

    if (ast.type == JSNodeType.FunctionDeclaration
        ||
        ast.type == JSNodeType.FunctionExpression
        ||
        ast.type == JSNodeType.ArrowFunction) {
        if (ast.type !== JSNodeType.ArrowFunction) {

            const [id_node] = ast.nodes;

            if (id_node)
                state.glbl_decl.add(id(id_node));
        }
    }
}

function compileExpressionStatement(
    state: CompilerState,
    node: JSNode,
    LEAVE_ASSERTION_SITE: boolean,
    OUTER_SEQUENCED: boolean,
    mutate: (replacement_node: JSNode) => void
) {
    const {
        imports,
        tests,
        statements,
    } = state;

    let [expr] = node.nodes;

    if (node.nodes[0].type == JSNodeType.AwaitExpression) {
        state.AWAIT = true;
        expr = expr.nodes[0];
    }

    if (Is_Expression_An_Assertion_Site(node)) {

        expr.nodes[0].value = ""; // Forcefully delete assert name

        const
            assertion_site = compileAssertionSite(state, expr),
            data = compileTestsFromSourceAST(
                state.globals,
                expr,
                imports
            );

        if (LEAVE_ASSERTION_SITE) {
            for (const ref of data.required_references.values())
                state.glbl_ref.add(ref);

            mutate(assertion_site.ast);
        } else
            mutate(null);

        // Forcefully remove assert name to prevent it being used
        // as a reference lookup
        expr.nodes[0].value = "";

        const pending = <TestSite>{ assertion_site, data, offset: statements.length };

        tests.push(pending);

    } else if (expr.type == JSNodeType.CallExpression) {

        const val = expr.nodes[0].value.toString();

        if (val == "assert_group") {

            const mutate_node = compileAssertionGroupSite(state, expr, OUTER_SEQUENCED);

            mutate(mutate_node);

        } else {

            const prop = compileTestsFromSourceAST(state.globals, node, state.imports);

            prop.FORCE_USE = true;

            combinePropRefsAndDecl(state, prop);

            statements.push(prop);

        }

    } else {

        const prop = compileTestsFromSourceAST(state.globals, node, imports);

        state.glbl_ref = setGlobalRef(prop, state.glbl_ref);

        statements.push(prop);
    }

    state.AWAIT;
}
export function combinePropRefsAndDecl(state: CompilerState, prop: StatementProp) {
    state.glbl_ref = setGlobalRef(prop, state.glbl_ref);
    state.glbl_decl = setGlobalDecl(prop, state.glbl_decl);
}

function compileMiscellaneous(state: CompilerState, node: JSNode) {

    const { tests: tests, statements } = state;

    if (node.type == JSNodeType.LabeledStatement && node.nodes[0].value == "keep")
        state.FORCE_USE = true;

    if (node.type & JSNodeClass.STATEMENT) {
        // Extract IdentifierReferences and IdentifierAssignments 
        // and append to the statement scope.
        const

            prop = compileTestsFromSourceAST(state.globals, node, state.imports),

            pending_test = prop.assertion_sites
                .map(r => repackageAssertionSite(r, prop, statements.length));

        tests.push(...pending_test);

        state.AWAIT = prop.AWAIT || state.AWAIT;

        combinePropRefsAndDecl(state, prop);

        prop.FORCE_USE = state.FORCE_USE || prop.FORCE_USE;

        if (prop.stmt?.nodes?.length >= 0)
            statements.push(prop);
    }
}

function compileArrowFunction(state: CompilerState, node: JSNode) {

    const prop = compileTestsFromSourceAST(state.globals, node, state.imports);

    combinePropRefsAndDecl(state, prop);

    state.AWAIT = prop.AWAIT || state.AWAIT;
}

export function compileLoopingStatement(
    state: CompilerState,
    node: JSNode,
    LEAVE_ASSERTION_SITE = false,
    OUT_SEQUENCED = false,
    RETURN_PROPS_ONLY = false
) {

    const
        { tests: tests, statements } = state,
        block = getFirstBlockStatement(node);

    if (block) {

        const prop = compileTestsFromSourceAST(state.globals, block, state.imports, LEAVE_ASSERTION_SITE, OUT_SEQUENCED);

        if (RETURN_PROPS_ONLY) return prop;

        combinePropRefsAndDecl(state, prop);

        for (const assertion_site of prop.assertion_sites) {

            assertion_site.ast = replaceFirstBlockContentWithNodes(node, assertion_site.ast);

            tests.push(repackageAssertionSite(assertion_site, prop, statements.length));
        }

        if (prop.stmt.nodes.length > 0) {
            state.AWAIT = prop.AWAIT || state.AWAIT;
            statements.push(prop);
        }
    }

    return null;
}

function compileClosureStatement(state: CompilerState, node: JSNode) {

    const
        { tests: tests, statements, declarations } = state,
        prop = compileTestsFromSourceAST(state.globals, node, state.imports);

    combinePropRefsAndDecl(state, prop);

    for (const rig of prop.assertion_sites)
        tests.push(repackageAssertionSite(rig, prop, statements.length));

    if (prop.stmt.nodes.length > 0) {

        state.AWAIT = prop.AWAIT || state.AWAIT;

        if (node.type != JSNodeType.BlockStatement)
            declarations.push(prop);
        else
            statements.push(prop);
    }
}

export function repackageAssertionSite(assertion_site: AssertionSite,
    s: StatementProp,
    offset: number
): TestSite {
    return <TestSite>{
        assertion_site,
        data: Object.assign(s,
            {
                b: true,
                required_references: new setUnion(s.required_references,
                    assertion_site.import_names)
            }),
        offset
    };
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

