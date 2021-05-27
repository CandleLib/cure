import { copy, traverse } from "@candlelib/conflagrate";
import { JSExpressionStatement, JSNode, JSNodeClass, JSNodeType, JSNodeTypeLU, JSStatementClass, renderWithFormatting, tools } from "@candlelib/js";
import { AssertionSite, AssertionSiteClosure } from "../types/assertion_site.js";
import { CompilerState } from "../types/compiler_state";
import { Globals } from "../types/globals.js";
import { ImportModule } from "../types/imports.js";
import { StatementReference } from "../types/statement_props";
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
    suite_names = "",
    LEAVE_ASSERTION_SITE = false,
    OUTER_SEQUENCED = false,
): StatementReference {

    const options = createCompilerState(globals, AST, Imports, suite_names);

    captureFunctionParameterNames(options);

    captureForLoopDeclarations(options);

    walkJSNodeTree(options, LEAVE_ASSERTION_SITE, OUTER_SEQUENCED);

    return compileRigsFromDeclarationsStatementsAndTestSites(options);
}

function compileRigsFromDeclarationsStatementsAndTestSites({
    ast,
    test_closures,
    statement_references,
    declaration_references,
    AWAIT,
    global_reference_ids,
    global_declaration_ids
}: CompilerState) {

    const assertion_sites = [];

    for (const { assertion_site, statement_index, statement_reference } of test_closures) {


        const { required_statements, imports }
            = compileStatementsAndDeclarations(statement_reference, statement_index, statement_references, declaration_references);

        assertion_site.ast = <JSNode>{
            type: JSNodeType.Script,
            nodes: [
                ...required_statements,
                ...(assertion_site.ast.type == JSNodeType.Script ?
                    assertion_site.ast.nodes :
                    [assertion_site.ast])
            ],
            pos: ast.pos
        };

        assertion_site.import_names = imports;

        assertion_sites.push(assertion_site);
    }

    for (const declaration_reference of declaration_references) {

        if (declaration_reference.required_references.size > 0)

            if (declaration_reference.declared_variables.size > 0)
                global_reference_ids =
                    new setDiff(new setUnion(global_reference_ids,
                        declaration_reference.required_references),
                        declaration_reference.declared_variables);
            else
                global_reference_ids
                    = new setUnion(global_reference_ids,
                        declaration_reference.required_references);
    }

    return <StatementReference>{
        stmt: ast,
        declared_variables: <Set<string>>global_declaration_ids,
        required_references: new setDiff(
            global_reference_ids,
            global_declaration_ids
        ),
        FORCE_USE: false,
        assertion_sites: assertion_sites,
        AWAIT
    };
}


function walkJSNodeTree(state: CompilerState, LEAVE_ASSERTION_SITE: boolean, OUTER_SEQUENCED: boolean) {


    for (let { node, meta: { skip, mutate, index } } of jst(state.ast)
        .skipRoot()
        .makeSkippable()
        .makeMutable()) {

        state.FORCE_USE = false;

        switch (node.type) {
            //Nodes only found in for(;;) statements
            // These should should be treated as
            // the function parameters/arguments of the for loop.
            // case JSNodeType.LexicalDeclaration: // TODO - Create/Rename node types ForLexicalDeclaration and ForVariableDeclaration
            case JSNodeType.VariableDeclaration:
                setGlobalDeclarations(node, state); skip(); break;

            case JSNodeType.FormalParameters:
                continue;

            case JSNodeType.ImportDeclaration:
                compileImport(node, state); skip(); break;

            case JSNodeType.IdentifierBinding:
                setGlobalDeclarations(node, state); break;

            case JSNodeType.IdentifierReference:
                if (id(node)) state.global_reference_ids.add(id(node)); break;

            case JSNodeType.AwaitExpression:
                state.AWAIT = true; break;

            case JSNodeType.ExpressionStatement:

                const mutation = compileExpressionStatement(state, node, LEAVE_ASSERTION_SITE, OUTER_SEQUENCED);

                if (mutation || mutation === null) mutate(<JSNode>mutation);

                skip();

                break;

            case JSNodeType.TryStatement:
            case JSNodeType.ForOfStatement:
            case JSNodeType.ForStatement:
            case JSNodeType.ForInStatement:
            case JSNodeType.DoStatement:
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
                    state.global_declaration_ids.add(id(bdg));

            default:

                if (Node_Is_Statement_Node(node)) {


                    if (node.type == JSNodeType.LabeledStatement && node.nodes[0].value == "keep")
                        state.FORCE_USE = true;

                    compileMiscellaneous(state, node);

                    skip();
                }
                break;
        }
    }
}
function Node_Is_Statement_Node(node: JSNode): node is JSStatementClass {
    return (node.type & JSNodeClass.STATEMENT) > 0;
}

function setGlobalDeclarations(expr: JSNode, state: CompilerState) {
    for (const { node } of jst(expr))
        if (node.type == JSNodeType.IdentifierBinding) {
            if (id(node)) state.global_declaration_ids.add(id(node));
        }
}

function setLocalDeclarations(expr: JSNode, state: CompilerState) {
    for (const { node } of jst(expr))
        if (node.type == JSNodeType.IdentifierBinding)
            if (id(node)) state.global_declaration_ids.add(id(node));
}

export function compileEnclosingStatement(
    state: CompilerState,
    node_containing_block: JSNode,
    LEAVE_ASSERTION_SITE = false,
    OUT_SEQUENCED = false,
    RETURN_PROPS_ONLY = false
): StatementReference {

    const
        receiver = { ast: null },

        stmt_ref = compileTestsFromSourceAST(state.globals,
            node_containing_block,
            state.imported_modules,
            state.suite_name,
            LEAVE_ASSERTION_SITE,
            OUT_SEQUENCED,
        );

    if (RETURN_PROPS_ONLY) return stmt_ref;

    mergeStatementReferencesAndDeclarations(state, stmt_ref);

    for (const assertion_site of stmt_ref.assertion_sites) {

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
                    //c.nodes.push(...assertion_site.ast.nodes);
                    replace(c);
                }
            }

            assertion_site.ast = receiver.ast;
        }

        assertion_site.origin = node_containing_block;

    }

    packageAssertionSites(state, stmt_ref);

    state.AWAIT = stmt_ref.AWAIT || state.AWAIT;

    return null;
}

export function mergeStatementReferencesAndDeclarations(
    state: CompilerState,
    prop: StatementReference) {
    state.global_reference_ids = setGlobalRef(prop, state.global_reference_ids);
    state.global_declaration_ids = setGlobalDecl(prop, state.global_declaration_ids);
}

function captureFunctionParameterNames(state: CompilerState) {

    const { ast } = state;

    if (ast.type == JSNodeType.FunctionDeclaration
        ||
        ast.type == JSNodeType.FunctionExpression) {

        const [id_node] = ast.nodes;

        if (id_node)
            state.global_declaration_ids.add(id(id_node));
    }
}


function captureForLoopDeclarations(state: CompilerState) {

    const { ast } = state;

    if (ast.type == JSNodeType.ForInStatement
        ||
        ast.type == JSNodeType.ForOfStatement
        ||
        ast.type == JSNodeType.ForStatement) {

        for (const { node } of jst(ast, 5).filter("type", JSNodeType.IdentifierBinding))
            setGlobalDeclarations(node, state);
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
    node: JSStatementClass,
    FORCE_USE: boolean = false
) {

    const statement_reference = compileTestsFromSourceAST(state.globals, node, state.imported_modules, state.suite_name);

    mergeStatementReferencesAndDeclarations(state, statement_reference);

    state.AWAIT = statement_reference.AWAIT || state.AWAIT;

    if (Node_Is_Statement_Node(node)) {

        // Extract IdentifierReferences and IdentifierAssignments 
        // and append to the statement scope.

        packageAssertionSites(state, statement_reference);

        statement_reference.FORCE_USE = state.FORCE_USE || statement_reference.FORCE_USE || FORCE_USE;
    }

    if (statement_reference?.stmt?.nodes?.length > 0) {
        if ((node.type & JSNodeClass.HOISTABLE_DECLARATION) > 0)
            state.declaration_references.push(statement_reference);
        else
            state.statement_references.push(statement_reference);
    }

    return statement_reference;
}

export function packageAssertionSites(state: CompilerState, stmt_ref: StatementReference, assertion_sites: AssertionSite | AssertionSite[] = stmt_ref.assertion_sites) {

    for (const assertion_site of Array.isArray(assertion_sites) ? assertion_sites : [assertion_sites]) {

        let packaged_stmt_ref = stmt_ref;

        if (assertion_site.import_names.size > 0) {
            packaged_stmt_ref = Object.assign({}, stmt_ref);
            packaged_stmt_ref.required_references = new setUnion(stmt_ref.required_references, new setDiff(assertion_site.import_names, stmt_ref.declared_variables));
        }

        assertion_site.IS_ASYNC = assertion_site.IS_ASYNC || state.AWAIT;

        state.test_closures.push(<AssertionSiteClosure>{
            assertion_site,
            statement_reference: packaged_stmt_ref,
            statement_index: state.statement_references.length
        });
    }
}

function setGlobalDecl(stmt_ref: StatementReference, global_declarations: closureSet | Set<string> | setUnion) {

    if (stmt_ref.declared_variables.size > 0)
        global_declarations = new setUnion(global_declarations, stmt_ref.declared_variables);

    return global_declarations;
}

function setGlobalRef(stmt_ref: StatementReference, glbl_ref: closureSet | Set<string> | setUnion) {

    if (stmt_ref.required_references.size > 0) {

        const ref = (stmt_ref.declared_variables.size > 0)
            ? new setDiff(stmt_ref.required_references, stmt_ref.declared_variables)
            : stmt_ref.required_references;

        return new setUnion(glbl_ref, ref);
    }

    return glbl_ref;
}
