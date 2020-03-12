import { MinTreeNodeType as $, render as $r, ext, MinTreeNodeClass, MinTreeNode, exp } from "@candlefw/js";
import { xtF, xtColor, xtReset, color, xtBold } from "@candlefw/wax";
import { Lexer } from "@candlefw/whind";

const EqualityLRMap = {
    ">": "to be more than",
    "<": "to be less than",
    "<=": "to be less than or equal to",
    ">=": "to be more than or equal to",
    "==": "to equal",
    "!=": "to not equal",
    "===": "to strictly equal",
    "!==": "to strictly not equal"
},

    EqualityRLMap = {
        "<": "to be more than",
        ">": "to be less than",
        ">=": "to be less than or equal to",
        "<=": "to be more than or equal to",
        "==": "to equal",
        "!=": "to not equal",
        "===": "to strictly equal",
        "!==": "to strictly not equal"
    },

    ref = xtF(xtBold, xtColor(color.lightgoldenrod2)),
    fail = xtF(xtBold, xtColor(color.steelblue1)),
    val = xtF(xtBold, xtColor(color.chartreuse3)),
    bg = xtF(xtBold, xtColor(color.gray23)),
    bg2 = xtF(xtColor(color.lightpink3)),
    resB = xtF(xtReset),
    res = xtF(xtReset);

export function getErrorMessageFromContent(node: MinTreeNode) {
    switch (node.type) {
        case $.EqualityExpression:
        case $.RelationalExpression:
            const left = ext(node).left, right = ext(node).right,

                left_value = (left.type & MinTreeNodeClass.VARIABLE || left.type & MinTreeNodeClass.EXPRESSION)
                    ? `${bg}[${ref + $r(left) + res} ⇒ ${val}\${s(${$r(left)})}${bg}]${resB + bg2}`
                    : `${bg}[${ref}\${s(${$r(left)})}${bg}]${resB + bg2}`,

                right_value = (right.type & MinTreeNodeClass.VARIABLE || right.type & MinTreeNodeClass.EXPRESSION)
                    ? `${bg}[${fail + $r(right) + res} ⇒ ${val}\${s(${$r(right)})}${bg}]${resB + bg2}`
                    : `${bg}[${fail}\${s(${$r(right)})}${bg}]${resB + bg2}`;

            if (right.type & MinTreeNodeClass.VARIABLE && !(left.type & MinTreeNodeClass.VARIABLE)) {
                return `Expected ${right_value} ${EqualityRLMap[node.symbol]} ${left_value}`;
            }
            else return `Expected ${left_value} ${EqualityLRMap[node.symbol]} ${right_value}`;
        default:
            return "Unexpected error occurred";
    }
}
/**
 * Adds color markings to expression that has thrown an error.
 */
export function markExceptionExpression(message: string, pos: Lexer): string {
    let copy = pos.copy();

    const start = pos.off;

    while (pos.ch !== "(" && pos.off > 0) pos.off--;
    if (pos.off <= 0) pos.off = start;
    else {
        pos.off++;
        while (copy.ch !== ")") copy.next();
    }

    const
        match_string = copy.slice(pos),
        ast = ext(exp(match_string), true);

    if (ast.type & MinTreeNodeClass.BINARY_EXPRESSION) {
        const { left, right, symbol } = ast,
            replace_string = [
                ref + $r(left),
                res + symbol,
                fail + $r(right) + res + bg2
            ].join(" ");

        message = message.replace(match_string, replace_string);
    }

    return bg2 + message + res;
}