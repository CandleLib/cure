import { MinTreeNodeType } from "@candlefw/js";
import { buildFormatRules, FormatRule as $ } from "@candlefw/conflagrate";

export const { format_rules } = buildFormatRules([{
    type: MinTreeNodeType.LexicalDeclaration,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT * 2 | $.MIN_LIST_ELE_LIMIT * 15
}, {
    type: MinTreeNodeType.AssignmentExpression,
    format_rule: $.OPTIONAL_SPACE
}, {
    type: MinTreeNodeType.BindingExpression,
    format_rule: $.OPTIONAL_SPACE
}, {
    type: MinTreeNodeType.IfStatement,
    format_rule: $.OPTIONAL_SPACE
}, {
    type: MinTreeNodeType.Script,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT * 2 | $.MIN_LIST_ELE_LIMIT
}, {
    type: MinTreeNodeType.BlockStatement,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT * 2 | $.MIN_LIST_ELE_LIMIT * 5
}, {
    type: MinTreeNodeType.FunctionBody,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT * 2 | $.MIN_LIST_ELE_LIMIT * 5
}, {
    type: MinTreeNodeType.ObjectLiteral,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT * 2 | $.MIN_LIST_ELE_LIMIT * 5
}, {
    type: MinTreeNodeType.Arguments,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT | $.MIN_LIST_ELE_LIMIT * 5
}, {
    type: MinTreeNodeType.FormalParameters,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT | $.MIN_LIST_ELE_LIMIT * 5
}, {
    type: MinTreeNodeType.ExpressionList,
    format_rule: $.INDENT | $.OPTIONAL_SPACE | $.LIST_SPLIT | $.MIN_LIST_ELE_LIMIT * 14
}]);
