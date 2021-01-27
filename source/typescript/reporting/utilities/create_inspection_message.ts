import { JSNode, JSNodeClass, JSNodeType, parser, renderWithFormatting } from "@candlefw/js";
import { getLexerFromLineColumnString, TestError } from "../../utilities/test_error.js";

import { Reporter } from "../../types/reporter.js";
import { TestInfo } from "../../types/test_info.js";
import { Test } from "../../types/test.js";
import { TestSuite } from "../../types/test_suite.js";

import { objC, objD, rst, symA, symC, symD, valA, valB } from "./colors.js";
import { format_rules } from "./format_rules.js";



function syntaxHighlight(str: string, prop_name, node: JSNode): string {

    const { type } = node;

    if ("==>><<<+-||&&!/*".includes(str))
        return symC + str + rst;

    if ("(){}[]".includes(str))
        return symD + str + rst;

    switch (type) {
        case JSNodeType.NewInstanceExpression:
        case JSNodeType.NewExpression:
        case JSNodeType.VariableDeclaration:
        case JSNodeType.LexicalDeclaration:
        case JSNodeType.IfStatement:
        case JSNodeType.ForInStatement:
        case JSNodeType.WhileStatement:
        case JSNodeType.DoStatement:
        case JSNodeType.TryStatement:
        case JSNodeType.ForOfStatement:
        case JSNodeType.ForOfStatement:
            return valB + str + rst;
        case JSNodeType.IdentifierProperty:
            return objD + str + rst;
        case JSNodeType.IdentifierBinding:
        case JSNodeType.IdentifierReference:
            return objC + str + rst;
        case JSNodeType.TemplateHead:
        case JSNodeType.TemplateMiddle:
        case JSNodeType.TemplateTail:
        case JSNodeType.Template:
        case JSNodeType.StringLiteral:
            return valA + str.replace(/\x1b\[[^m]+m/g, "") + rst;
    }

    if (type & JSNodeClass.LITERAL)
        return symA + str + rst;

    return str;
}
/**
 * Creates a printable inspection message.
 * @param result
 * @param test
 * @param suite
 * @param reporter
 */
export async function createInspectionMessage(result: TestInfo, test: Test, suite: TestSuite, reporter: Reporter, watched_files: Set<string>): Promise<string> {

    let errors = [];

    for (let error of result.errors) {

        if (error.WORKER)
            error = Object.assign(new TestError(""), error);

        errors.push(await error.toAsyncBlameString(watched_files));
    }
    const
        { msgD, pass, symD, valB, symC, symA, valA } = reporter.colors,
        { line, column } = test.pos,
        str_col = valA,
        num_col = symA,
        str = `${rst}
Duration: ${num_col + result.duration + rst}
Start Time: ${num_col + result.start + rst}
End Time: ${num_col + result.end + rst}
Timed Out: ${num_col + result.TIMED_OUT + rst}
Passed: ${num_col + result.PASSED + rst}

Asynchronous Test: ${num_col + test.IS_ASYNC + rst}
Browser Test: ${num_col + !!test.BROWSER + rst}

Source File: ${str_col + suite.origin + rst}

Imports:
    ${
            test.import_arg_specifiers.map(({ module_name, module_specifier }) => symD + module_name + rst + " from \n        " + pass + module_specifier + rst).join("\n    ")
            || pass + "none"}

-------------------------------------------------------------------------------

${getLexerFromLineColumnString(line + 1, column, suite.data, suite.origin).errorMessage("Source Location", suite.origin).split("\n").join(("\n    "))}

-------------------------------------------------------------------------------

Test Rig Source Code:

    ${renderWithFormatting(parser(test.source).ast, <any>format_rules, syntaxHighlight).trim().split("\n").join("\n    ")}

${rst}-------------------------------------------------------------------------------`;

    return str.trim();
}
