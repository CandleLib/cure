import { JSNodeType } from "@candlelib/js";
import { buildFormatRules, FormatRule as $ } from "@candlelib/conflagrate";

export const { format_rules } = buildFormatRules([{
    type: JSNodeType.LexicalDeclaration,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT * 2 | $.MIN_LIST_ELE_LIMIT * 15
}, {
    type: JSNodeType.AssignmentExpression,
    format_rule: $.OPTIONAL_SPACE
}, {
    type: JSNodeType.BindingExpression,
    format_rule: $.OPTIONAL_SPACE
}, {
    type: JSNodeType.IfStatement,
    format_rule: $.OPTIONAL_SPACE
}, {
    type: JSNodeType.Script,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT * 2 | $.MIN_LIST_ELE_LIMIT
}, {
    type: JSNodeType.BlockStatement,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT * 2 | $.MIN_LIST_ELE_LIMIT * 5
}, {
    type: JSNodeType.FunctionBody,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT * 2 | $.MIN_LIST_ELE_LIMIT * 5
}, {
    type: JSNodeType.ObjectLiteral,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT * 2 | $.MIN_LIST_ELE_LIMIT * 5
}, {
    type: JSNodeType.Arguments,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT | $.MIN_LIST_ELE_LIMIT * 5
}, {
    type: JSNodeType.FormalParameters,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT | $.MIN_LIST_ELE_LIMIT * 5
}, {
    type: JSNodeType.ExpressionList,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT | $.MIN_LIST_ELE_LIMIT * 14
}]);
