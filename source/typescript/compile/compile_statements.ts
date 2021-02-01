import { copy, traverse } from "@candlefw/conflagrate";
import { JSExpressionStatement, JSNode, JSNodeClass, JSNodeType, tools } from "@candlefw/js";
import { AssertionSite, AssertionSiteClosure } from "../types/assertion_site.js";
import { CompilerState } from "../types/compiler_state";
import { Globals } from "../types/globals.js";
import { ImportModule } from "../types/imports.js";
import { StatementProp } from "../types/statement_props";
import { closureSet, setDiff, setUnion } from "../utilities/sets.js";
import { compileAssertionGroupSite, compileAssertionSite } from "./assertion_site/compile_assertion_site.js";
import { compileImport } from "./compile_import.js";
import { compileStatementsAndDeclarations } from "./compile_statements_and_declarations.js";
import { createCompilerState as createCompilerState } from "./create_compiler_state.js";
import { Expression_Is_An_Assertion_Group_Site, Expression_Is_An_Assertion_Site } from "./utilities/is_expression_assertion_site.js";
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
    AST: ast,
    tests,
    statements,
    declarations,
    AWAIT,
    global_references,
    global_declarations
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


    for (const decl of declarations)

        if (decl.required_references.size > 0)

            if (decl.declared_variables.size > 0)
                global_references = new setDiff(new setUnion(global_references, decl.required_references), decl.declared_variables);
            else
                global_references = new setUnion(global_references, decl.required_references);

    return <StatementProp>{
        stmt: ast,
        declared_variables: <Set<string>>global_declarations,
        required_references: new setDiff(global_references, global_declarations),
        FORCE_USE: false,
        assertion_sites: assertion_sites,
        AWAIT
    };
}


function walkJSNodeTree(state: CompilerState, LEAVE_ASSERTION_SITE: boolean, OUTER_SEQUENCED: boolean) {


    for (let { node, meta: { skip, mutate, index } } of jst(state.AST)
        .skipRoot()
        .makeSkippable()
        .makeMutable()) {
        state.FORCE_USE = false;

        switch (node.type) {

            case JSNodeType.FormalParameters:
                continue;

            case JSNodeType.ImportDeclaration:
                compileImport(node, state); skip(); break;

            case JSNodeType.IdentifierBinding:
                if (id(node)) state.global_declarations.add(id(node)); break;

            case JSNodeType.IdentifierReference:
                if (id(node)) state.global_references.add(id(node)); break;

            case JSNodeType.AwaitExpression:
                state.AWAIT = true; break;

            case JSNodeType.ExpressionStatement:

                const mutation = compileExpressionStatement(state, node, LEAVE_ASSERTION_SITE, OUTER_SEQUENCED);

                if (mutation || mutation === null) mutate(<JSNode>mutation);

                skip();

                break;

            case JSNodeType.TryStatement:
            case JSNodeType.ForOfStatement:
            case JSNodeType.ForInStatement:
            case JSNodeType.DoStatement:
            case JSNodeType.ForStatement:
            case JSNodeType.WhileStatement:
            case JSNodeType.BlockStatement:
            case JSNodeType.ArrowFunction:
                compileEnclosingStatement(state, node, LEAVE_ASSERTION_SITE, OUTER_SEQUENCED);
                skip();
                break;

            case JSNodeType.FunctionDeclaration:
            case JSNodeType.FunctionExpression:
                compileMiscellaneous(state, node); skip(); break;

            //case JSNodeType.ArrowFunction: compileArrowFunction(state, node); skip(); break;

            case JSNodeType.LexicalDeclaration:
                for (const { node: bdg } of traverse(node, "nodes", 2)
                    .skipRoot()
                    .filter("type", JSNodeType.IdentifierBinding))
                    state.global_declarations.add(id(bdg));

            default:

                if (node.type & JSNodeClass.STATEMENT) {

                    if (node.type == JSNodeType.LabeledStatement && node.nodes[0].value == "keep")
                        state.FORCE_USE = true;

                    compileMiscellaneous(state, node);
                    skip();
                }
                break;
        }
    }
}
export function compileEnclosingStatement(
    state: CompilerState,
    node_containing_block: JSNode,
    LEAVE_ASSERTION_SITE = false,
    OUT_SEQUENCED = false,
    RETURN_PROPS_ONLY = false
): StatementProp {

    const receiver = { ast: null };

    const prop = compileTestsFromSourceAST(state.globals, node_containing_block, state.imports, LEAVE_ASSERTION_SITE, OUT_SEQUENCED);

    if (RETURN_PROPS_ONLY) return prop;

    combinePropRefsAndDecl(state, prop);

    for (const assertion_site of prop.assertion_sites) {

        if (assertion_site.origin == node_containing_block) {
            //const c = copy(node_containing_block);
            //c.nodes.length = 0;
            //c.nodes.push(assertion_site.ast);
            //assertion_site.ast = c;
        } else {

            for (const { node, meta: { replace } } of jst(node_containing_block).makeReplaceable().extract(receiver)) {
                if (node == assertion_site.origin) {
                    const c = copy(node);
                    c.nodes.length = 0;
                    //@ts-ignore
                    c.nodes.push(assertion_site.ast);
                    replace(c);
                }
            }

            assertion_site.ast = receiver.ast;
        }

        assertion_site.origin = node_containing_block;
    }

    packageAssertionSites(state, prop);

    if (prop.stmt.nodes.length > 0) {
        state.AWAIT = prop.AWAIT || state.AWAIT;
        //    state.statements.push(prop);
    }


    return null;
}

export function combinePropRefsAndDecl(
    state: CompilerState,
    prop: StatementProp) {
    state.global_references = setGlobalRef(prop, state.global_references);
    state.global_declarations = setGlobalDecl(prop, state.global_declarations);
}

function captureFunctionParameterNames(state: CompilerState) {

    const { AST } = state;

    if (AST.type == JSNodeType.FunctionDeclaration
        ||
        AST.type == JSNodeType.FunctionExpression
        ||
        AST.type == JSNodeType.ArrowFunction) {
        if (AST.type !== JSNodeType.ArrowFunction) {

            const [id_node] = AST.nodes;

            if (id_node)
                state.global_declarations.add(id(id_node));
        }
    }
}

function compileExpressionStatement(
    state: CompilerState,
    node: JSExpressionStatement,
    LEAVE_ASSERTION_SITE: boolean,
    OUTER_SEQUENCED: boolean,
) {

    let [expr] = node.nodes;

    if (expr.type == JSNodeType.AwaitExpression) {
        state.AWAIT = true;
        expr = expr.nodes[0];
    }
    if (Expression_Is_An_Assertion_Site(expr))

        return compileAssertionSite(state, expr, LEAVE_ASSERTION_SITE);

    else if (Expression_Is_An_Assertion_Group_Site(expr))

        return compileAssertionGroupSite(state, expr, OUTER_SEQUENCED);

    else if (expr.type == JSNodeType.CallExpression)

        return void compileMiscellaneous(state, node, true);

    else

        return void compileMiscellaneous(state, node);
}

function compileMiscellaneous(
    state: CompilerState,
    node: JSNode,
    FORCE_USE: boolean = false
) {

    const prop = compileTestsFromSourceAST(state.globals, node, state.imports);

    combinePropRefsAndDecl(state, prop);

    state.AWAIT = prop.AWAIT || state.AWAIT;

    if (node.type & JSNodeClass.STATEMENT) {
        // Extract IdentifierReferences and IdentifierAssignments 
        // and append to the statement scope.

        packageAssertionSites(state, prop);

        prop.FORCE_USE = state.FORCE_USE || prop.FORCE_USE || FORCE_USE;
    }

    if (prop?.stmt?.nodes?.length > 0) {
        if (node.type & JSNodeClass.HOISTABLE_DECLARATION)
            state.declarations.push(prop);
        else
            state.statements.push(prop);
    }

    return prop;
}

function compileArrowFunction(state: CompilerState, node: JSNode) {

    const prop = compileTestsFromSourceAST(state.globals, node, state.imports);

    combinePropRefsAndDecl(state, prop);

    state.AWAIT = prop.AWAIT || state.AWAIT;
}


export function packageAssertionSites(state: CompilerState, prop: StatementProp, assertion_sites: AssertionSite | AssertionSite[] = prop.assertion_sites) {

    for (const assertion_site of Array.isArray(assertion_sites) ? assertion_sites : [assertion_sites]) {

        let packaged_prop = prop;

        if (assertion_site.import_names.size > 0) {
            packaged_prop = Object.assign({}, prop);
            packaged_prop.required_references = new setUnion(prop.required_references, assertion_site.import_names);
        }

        state.test_closures.push(<AssertionSiteClosure>{
            assertion_site,
            data: packaged_prop,
            offset: state.statements.length
        });
    }
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
