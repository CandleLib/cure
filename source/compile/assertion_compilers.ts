import { render as $r, MinTreeNodeType, MinTreeNodeClass, ext } from "@candlefw/js";

import { AssertionSiteCompiler } from "../types/assertion_site_compiler.js";

import { rst } from "../utilities/colors.js";

function sanitizeTemplate(string) {
    return string;
}

const $ = sanitizeTemplate;

const default_assertions_site_compilers: Array<AssertionSiteCompiler> = [

    {

        signature: MinTreeNodeClass.BINARY_EXPRESSION,

        test: node => {
            return node.type == MinTreeNodeType.EqualityExpression || node.type == MinTreeNodeType.RelationalExpression;
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

        getExceptionMessage: (node, rp) => {

            const

                { fail, bkgr, symA, objA, valA, objB, valB } = rp.colors,

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
                    ? `${bkgr}[${objA + $r(left).replace(/\`/g, "\"") + symA} ⇒ ${valA}\${$cfw.makeLiteral($cfw.regA)}${bkgr}]${fail}`
                    : `${bkgr}[${objA}\${$cfw.makeLiteral($cfw.regA)}${bkgr}]${fail}`,

                right_value = (right.type & MinTreeNodeClass.VARIABLE || right.type & MinTreeNodeClass.EXPRESSION)
                    ? `${bkgr}[${objB + $r(right).replace(/\`/g, "\"") + symA} ⇒ ${valB}\${$cfw.makeLiteral($cfw.regB)}${bkgr}]${fail}`
                    : `${bkgr}[${objB}\${$cfw.makeLiteral($cfw.regB)}${bkgr}]${fail}`;

            return {
                message: `${fail}Expected ${$(left_value)} ${equality_map[node.symbol]} ${$(right_value)}`,
                highlight: [objA + $r(left), symA + node.symbol, objB + $r(right) + fail].join(" "),
                match: node.pos.slice(),
                column: right.pos.char - equal.symbol.length - 1,
                line: right.pos.line
            };
        },
    },

    <AssertionSiteCompiler>{

        signature: MinTreeNodeType.BooleanLiteral,

        test: node => {
            return true;
        },

        build: node => {
            return `true`;
        },

        getExceptionMessage: (node, rp) => {

            const
                { fail, bkgr, symA, objA, valA } = rp.colors,

                value = node.value;

            return {
                message: `${fail}Boolean literal ${bkgr}[${valA + value + bkgr}]${fail} provides no useful test information`,
                highlight: valA + node.value + fail,
                match: node.value + "",
                column: 0,
                line: 0
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

        getExceptionMessage: (node, rp) => {

            const
                { fail, bkgr, symA, objA, valA } = rp.colors,

                call = ext(node);

            return {
                message: `${fail}Expected ${bkgr}[${objA + call.pos.slice() + symA} ⇒ ${valA}\${$cfw.makeLiteral($cfw.caught_exception)}${bkgr}]${fail} to not throw an exception${fail}`,
                highlight: objA + call.pos.slice() + fail,
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

        getExceptionMessage: (node, rp) => {

            const
                { fail, bkgr, symA, objA, valA } = rp.colors,

                unary = ext(node);

            return {
                message: `${fail}Expected ${bkgr}[${objA + unary.expression.pos.slice() + symA} ⇒ ${valA}\${$cfw.makeLiteral($cfw.regA)}${bkgr}]${fail} to throw an exception${fail}`,
                highlight: objA + unary.pos.slice() + fail,
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

        getExceptionMessage: (node, rp) => {

            const

                { fail, bkgr, symA, objA, valA, objB, valB, msgA } = rp.colors,

                assign = ext(node),

                left = assign.identifier,

                right = assign.expression,

                left_value = `${bkgr}[${objA + $r(left) + symA} ⇒ ${valA}\${$cfw.makeLiteral(${$r(left)})}${bkgr}]${fail}`,

                right_value = `${bkgr}[${objB + $r(right) + symA} ⇒ ${valB}\${$cfw.makeLiteral(${$r(right)})}${bkgr}]${fail}`;

            return {
                message: `${fail}Assignment [${left_value} ${rst + assign.symbol} ${right_value}] not allowed in assertion site`
                    + `\n    ${msgA}Should this have been an Equality Expression or Relational Expression?${fail}\n`,
                highlight: [valA + $r(left), rst + node.symbol, fail + $r(right) + rst + fail].join(" "),
                match: node.pos.slice(),
                column: right.pos.char - assign.symbol.length - 1,
                line: right.pos.line
            };
        },
    },
];;

export default default_assertions_site_compilers;
