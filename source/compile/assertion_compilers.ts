import { render as $r, MinTreeNodeType, MinTreeNodeClass, ext } from "@candlefw/js";

import { AssertionSiteCompiler } from "../types/assertion_site_compiler.js";

import { fail, rst, bg, ref, val, resB, c_fail, c_reset } from "../utilities/colors.js";

function sanitizeTemplate(string) {
    return string;
}

const $ = sanitizeTemplate;

export default [


    <AssertionSiteCompiler>{

        signature: MinTreeNodeClass.BINARY_EXPRESSION,

        test: node => {
            return node.type == MinTreeNodeType.EqualityExpression || MinTreeNodeType.RelationalExpression;
        },

        build: node => {
            const equality_map = {
                "==": "$cfw.equal",
                "!=": "$cfw.notEqual"
            };

            if (node.symbol == "!=" || node.symbol == "==")
                return `!(${equality_map[node.symbol]}(${node.nodes[0].pos.slice()},${node.nodes[1].pos.slice()}))`;
            else
                return `!($cfw.regA = ${node.nodes[0].pos.slice()},$cfw.regB = ${node.nodes[1].pos.slice()},${node.pos.slice()})`;
        },

        getExceptionMessage: node => {

            const

                equal = ext(node),

                equality_map = {
                    "==": "to equal",
                    "!=": "to not equal",
                    "===": "to strictly equal",
                    "!==": "to strictly not equal",
                    ">=": "to be more than or equal to",
                    "<=": "to be less than or equal to",
                    ">": "to be more than",
                    "<": "to be less than"
                },

                left = equal.left,

                right = equal.right,

                left_value = (left.type & MinTreeNodeClass.VARIABLE || left.type & MinTreeNodeClass.EXPRESSION)
                    ? `${bg}[${ref + $r(left) + rst} ⇒ ${val}\${$cfw.makeLiteral($cfw.regA)}${bg}]${resB + c_fail}`
                    : `${bg}[${ref}\${$cfw.makeLiteral($cfw.regA)}${bg}]${resB + c_fail}`,

                right_value = (right.type & MinTreeNodeClass.VARIABLE || right.type & MinTreeNodeClass.EXPRESSION)
                    ? `${bg}[${fail + $r(right) + rst} ⇒ ${val}\${$cfw.makeLiteral($cfw.regB)}${bg}]${resB + c_fail}`
                    : `${bg}[${fail}\${$cfw.makeLiteral($cfw.regB)}${bg}]${resB + c_fail}`;

            return {
                message: `${c_fail}Expected ${$(left_value)} ${equality_map[node.symbol]} ${$(right_value)}`,
                highlight: [ref + $r(left), rst + node.symbol, fail + $r(right) + rst + c_fail].join(" "),
                match: node.pos.slice(),
                column: right.pos.char - equal.symbol.length - 1,
                line: right.pos.line
            };
        },
    },


    <AssertionSiteCompiler>{

        signature: MinTreeNodeType.CallExpression,

        test: node => {
            return true;
        },

        build: node => {
            return `$cfw.throws(()=>($cfw.regA=undefined, $cfw.regA = ${node.pos.slice()}))`;
        },

        getExceptionMessage: node => {

            const call = ext(node);

            return {
                message: `${c_fail}Expected [${ref + call.pos.slice() + c_reset} ⇒ ${val}\${$cfw.makeLiteral($cfw.caught_exception)}${c_fail}] to not throw an exception${c_fail}`,
                highlight: ref + call.pos.slice() + c_fail,
                match: node.pos.slice(),
                column: 0,
                line: 0
            };
        },
    },


    <AssertionSiteCompiler>{

        signature: MinTreeNodeType.UnaryExpression,

        test: node => {
            return node.symbol == "!" && node.nodes[0].type == MinTreeNodeType.CallExpression;
        },

        build: node => {
            return `!$cfw.throws(()=>($cfw.regA=undefined, $cfw.regA = ${node.nodes[0].pos.slice()}))`;
        },

        getExceptionMessage: node => {

            const unary = ext(node);

            return {
                message: `${c_fail}Expected [${ref + unary.expression.pos.slice() + c_reset} ⇒ ${val}\${$cfw.makeLiteral($cfw.regA)}${c_fail}] to throw an exception${c_fail}`,
                highlight: ref + unary.pos.slice() + c_fail,
                match: node.pos.slice(),
                column: node.nodes[0].pos.char,
                line: 0
            };
        },
    },

    <AssertionSiteCompiler>{

        signature: MinTreeNodeType.AssignmentExpression,

        test: node => {
            return true;
        },

        build: node => {
            return `true`;
        },

        getExceptionMessage: node => {
            const
                assign = ext(node),

                left = assign.identifier,

                right = assign.expression,

                left_value = `${bg}[${ref + $r(left) + rst} ⇒ ${val}\${$cfw.makeLiteral(${$r(left)})}${bg}]${resB + c_fail}`,

                right_value = `${bg}[${fail + $r(right) + rst} ⇒ ${val}\${$cfw.makeLiteral(${$r(right)})}${bg}]${resB + c_fail}`;

            return {
                message: `${c_fail}Assignment [${left_value} ${c_reset + assign.symbol} ${right_value}] not allowed in assertion site`
                    + `\n    ${c_reset}Should this have been an Equality Expression or Relational Expression?${c_fail}\n`,
                highlight: [ref + $r(left), rst + node.symbol, fail + $r(right) + rst + c_fail].join(" "),
                match: node.pos.slice(),
                column: right.pos.char - assign.symbol.length - 1,
                line: right.pos.line
            };
        },
    },
];;
