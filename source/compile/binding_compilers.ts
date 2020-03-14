import { render as $r, MinTreeNodeType, MinTreeNodeClass, ext } from "@candlefw/js";
import { BindingExpressionCompiler } from "../types/binding_compile.js";

import { fail, rst, bg, ref, val, resB, bg2, c_fail, c_reset } from "../utilities/colors.js";


export default [


    <BindingExpressionCompiler>{

        signature: MinTreeNodeClass.BINARY_EXPRESSION,

        test: node => {
            return node.type == MinTreeNodeType.EqualityExpression || MinTreeNodeType.RelationalExpression;
        },

        build: node => {
            const equality_map = {
                "==": "i.equal",
                "!=": "i.notEqual"
            };

            if (node.symbol == "!=" || node.symbol == "==")
                return `!(${equality_map[node.symbol]}(${node.nodes[0].pos.slice()}, ${node.nodes[1].pos.slice()}))`;
            else
                return `!(${node.pos.slice()})`;
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
                    ? `${bg}[${ref + $r(left) + rst} ⇒ ${val}\${i.makeLiteral(${$r(left)})}${bg}]${resB + bg2}`
                    : `${bg}[${ref}\${i.makeLiteral(${$r(left)})}${bg}]${resB + bg2}`, right_value = (right.type & MinTreeNodeClass.VARIABLE || right.type & MinTreeNodeClass.EXPRESSION)
                        ? `${bg}[${fail + $r(right) + rst} ⇒ ${val}\${i.makeLiteral(${$r(right)})}${bg}]${resB + bg2}`
                        : `${bg}[${fail}\${i.makeLiteral(${$r(right)})}${bg}]${resB + bg2}`;

            return {
                message: `${c_fail}Expected ${right_value} ${equality_map[node.symbol]} ${left_value}`,
                highlight: [ref + $r(left), rst + node.symbol, fail + $r(right) + rst + bg2].join(" "),
                match: node.pos.slice(),
                column: right.pos.char - equal.symbol.length - 1,
                line: right.pos.line
            };
        },
    },


    <BindingExpressionCompiler>{

        signature: MinTreeNodeType.CallExpression,

        test: node => {
            return true;
        },

        build: node => {
            return `i.throws(()=>(i.temp=undefined, i.temp = ${node.pos.slice()}))`;
        },

        getExceptionMessage: node => {
            const

                call = ext(node);

            return {
                message: `${c_fail}Expected [${ref + call.pos.slice() + c_reset} ⇒ ${val}\${i.makeLiteral(i.caught_exception)}${c_fail}] to not throw an exception${c_fail}`,
                highlight: ref + call.pos.slice() + c_fail,
                match: node.pos.slice(),
                column: 0,
                line: 0
            };
        },
    },


    <BindingExpressionCompiler>{

        signature: MinTreeNodeType.UnaryExpression,

        test: node => {
            return node.symbol == "!" && node.nodes[0].type == MinTreeNodeType.CallExpression;
        },

        build: node => {
            return `!i.throws(()=>(i.temp=undefined, i.temp = ${node.nodes[0].pos.slice()}))`;
        },

        getExceptionMessage: node => {

            const
                unary = ext(node);

            return {
                message: `${c_fail}Expected [${ref + unary.expression.pos.slice() + c_reset} ⇒ ${val}\${i.makeLiteral(i.temp)}${c_fail}] to throw an exception${c_fail}`,
                highlight: ref + unary.pos.slice() + c_fail,
                match: node.pos.slice(),
                column: node.nodes[0].pos.char,
                line: 0
            };
        },
    }
];
