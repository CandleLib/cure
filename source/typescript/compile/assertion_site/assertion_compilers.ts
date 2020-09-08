import { renderCompressed as $r, JSNodeType, JSNodeClass } from "@candlefw/js";

import { AssertionSiteCompiler } from "../../types/assertion_site_compiler.js";

import { rst, valD } from "../../utilities/colors.js";

function sanitizeTemplate(string) {
    return string;
}

const
    $ = sanitizeTemplate,

    default_assertions_site_compilers: Array<AssertionSiteCompiler> = [

        /**
         * Relational and Equality Expressions
         */
        <AssertionSiteCompiler>{

            signature: JSNodeClass.BINARY_EXPRESSION,

            test: node => {
                return node.type == JSNodeType.EqualityExpression || node.type == JSNodeType.RelationalExpression;
            },

            build: node => {

                const equality_map = {
                    "==": "$harness.equal",
                    "!=": "$harness.notEqual"
                };

                if (node.symbol == "!=" || node.symbol == "==")
                    return `!(${equality_map[node.symbol]}(${node.nodes[0].pos.slice()},${node.nodes[1].pos.slice()}))`;
                else
                    return `!($harness.regA = ${node.nodes[0].pos.slice()},$harness.regB = ${node.nodes[1].pos.slice()},${node.pos.slice()})`;
            },

            getExceptionMessage: (node, rp) => {

                const

                    { fail, bkgr, symA, objA, valA, objB, valB } = rp.colors,

                    [left, right] = node.nodes,

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

                    left_value = (left.type & JSNodeClass.VARIABLE || left.type & JSNodeClass.EXPRESSION)
                        ? `${bkgr}[${objA + $r(left).replace(/\`/g, "\"") + symA} ⇒ ${valA}\${$harness.makeLiteral($harness.regA)}${bkgr}]${fail}`
                        : `${bkgr}[${objA}\${$harness.makeLiteral($harness.regA)}${bkgr}]${fail}`,

                    right_value = (right.type & JSNodeClass.VARIABLE || right.type & JSNodeClass.EXPRESSION)
                        ? `${bkgr}[${objB + $r(right).replace(/\`/g, "\"") + symA} ⇒ ${valB}\${$harness.makeLiteral($harness.regB)}${bkgr}]${fail}`
                        : `${bkgr}[${objB}\${$harness.makeLiteral($harness.regB)}${bkgr}]${fail}`;

                return {
                    message: `${fail}Expected ${$(left_value)} ${equality_map[node.symbol]} ${$(right_value)}`,
                    highlight: [objA + $r(left), symA + node.symbol, objB + $r(right) + fail].join(" "),
                    match: node.pos.slice(),
                    column: right.pos.column - node.symbol.length - 1,
                    line: right.pos.line
                };
            },
        },

        /**
         * Boolean
         */
        <AssertionSiteCompiler>{

            signature: JSNodeType.BooleanLiteral,

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
                    column: node.pos.column,
                    line: node.pos.line
                };
            },
        },

        /**
         * Call Expression Should Not Throw
         */
        <AssertionSiteCompiler>{

            signature: JSNodeType.CallExpression,

            test: node => {
                return true;
            },

            build: node => {
                return `$harness.throws(()=>($harness.regA=undefined, $harness.regA = ${node.pos.slice()}))`;
            },

            getExceptionMessage: (node, rp) => {

                const
                    { fail, bkgr, symA, objA, valA } = rp.colors;

                return {
                    message: `${fail}Expected ${bkgr}[${objA + node.pos.slice() + symA} ⇒ ${valA}\${$harness.makeLiteral($harness.caught_exception)}${bkgr}]${fail} to not throw an exception${fail}`,
                    highlight: valA + node.pos.slice() + fail,
                    match: node.pos.slice(),
                    column: node.pos.column,
                    line: node.pos.line
                };
            },
        },

        /**
         * Call Expression Should Throw
         */
        <AssertionSiteCompiler>{

            signature: JSNodeType.UnaryExpression,

            test: node => {
                return node.symbol == "!" && node.nodes[0].type == JSNodeType.CallExpression;
            },

            build: node => {
                return `!$harness.throws(()=>($harness.regA=undefined, $harness.regA = ${node.nodes[0].pos.slice()}))`;
            },

            getExceptionMessage: (node, rp) => {

                const { fail, bkgr, symA, objA, valA } = rp.colors,

                    unary = node,

                    [expression] = unary.nodes;

                return {
                    message: `${fail}Expected ${bkgr}[${objA + expression.pos.slice() + symA} ⇒ ${valA}\${$harness.makeLiteral($harness.regA)}${bkgr}]${fail} to throw an exception${fail}`,
                    highlight: objA + node.nodes[0].nodes[0].pos.slice().trim() + fail,
                    match: node.nodes[0].nodes[0].pos.slice().trim(),
                    column: node.nodes[0].pos.column,
                    line: node.nodes[0].pos.line
                };
            },
        },

        /**
         * Parenthesized expressions - Expect 3rd party assertion function call
         */
        <AssertionSiteCompiler>{

            signature: JSNodeType.Parenthesized,

            test: node => {
                return true;
            },

            build: node => {
                return `void ${node.pos.slice()}`;
            },

            getExceptionMessage: (node, rp) => {

                const

                    { fail, bkgr, symA, objA, valA, objB, valB, msgA } = rp.colors;

                return {
                    message: ``,
                    highlight: [valA + node.pos.slice() + fail].join(" "),
                    match: node.pos.slice(),
                    column: node.pos.column + 1,
                    line: node.pos.line
                };
            },
        },

        /**
         * Instanceof Expression
         */
        <AssertionSiteCompiler>{

            signature: JSNodeClass.BINARY_EXPRESSION,

            test: node => node.type == JSNodeType.InstanceOfExpression,

            build: node => {
                return `!(${node.pos.slice()})`;
            },

            getExceptionMessage: (node, rp) => {

                const

                    { fail, bkgr, symA, objA, valA, objB, valB, msgA } = rp.colors,

                    [left, right] = node.nodes,

                    left_value = `${bkgr}[${objA + $r(left) + symA} ⇒ ${valA}\${$harness.makeLiteral(${$r(left)})}${bkgr}]${fail}`,

                    right_value = `${bkgr}[${objB + $r(right) + symA} ⇒ ${valB}\${$harness.makeLiteral(${$r(right)})}${bkgr}]${fail}`;

                return {
                    message: `${fail} ${right_value} was not found in the prototype chain of ${left_value}`,
                    highlight: [objA + $r(left), rst + "instanceof", objB + $r(right) + rst + fail].join(" "),
                    match: node.pos.slice(),
                    column: right.pos.column - 11,
                    line: right.pos.line
                };
            },
        },

        /**
         * The following expression are considered invalid and always generate an error.
         */

        /**
         * Identifier - It's pure uselessness.
         * 
         * TODO - Should truthiness be evaluated instead?
         */
        <AssertionSiteCompiler>{

            signature: JSNodeClass.IDENTIFIER,

            test: node => {
                return true;
            },

            build: node => {
                return `true`;
            },

            getExceptionMessage: (node, rp) => {

                const

                    { fail, objA, msgA, valA, bkgr, symA } = rp.colors;

                return {
                    message: `${fail} Identifier ${bkgr}[${objA + node.pos.slice() + symA} ⇒ ${valA}\${$harness.makeLiteral(${node.pos.slice()})}${bkgr}]${fail} does not provide any useful test information.`
                        + `\n    ${msgA}Should this have been a ${valD}Call Expression${msgA}?${fail}\n`,
                    highlight: objA + node.pos.slice() + fail,
                    match: node.pos.slice(),
                    column: node.pos.column,
                    line: node.pos.line
                };
            },
        },

        /**
         * Member Expression - It's pure uselessness.
         *
         * TODO - Should truthiness be evaluated instead?
         */
        <AssertionSiteCompiler>{

            signature: JSNodeType.MemberExpression,

            test: node => {
                return true;
            },

            build: node => {
                return `true`;
            },

            getExceptionMessage: (node, rp) => {

                const

                    { fail, objA, msgA, valA, bkgr, symA } = rp.colors;

                return {
                    message: `${fail} Identifier ${bkgr}[${objA + node.pos.slice() + symA} ⇒ ${valA}\${$harness.makeLiteral(${node.pos.slice()})}${bkgr}]${fail} does not provide any useful test information.`
                        + `\n    ${msgA}Should this have been a ${valD}Call Expression${msgA}?${fail}\n`,
                    highlight: objA + node.pos.slice() + fail,
                    match: node.pos.slice(),
                    column: node.pos.column,
                    line: node.pos.line
                };
            },
        },

        /**
         * Assignment Expression - Can't happen, breaks independent nature of tests.
         */
        <AssertionSiteCompiler>{

            signature: JSNodeType.AssignmentExpression,

            test: node => {
                return true;
            },

            build: node => {
                return `true`;
            },

            getExceptionMessage: (node, rp) => {

                const

                    { fail, bkgr, symA, objA, valA, objB, valB, msgA, valC } = rp.colors,

                    [id, expr] = node.nodes,

                    left_value = `${bkgr}[${objA + $r(id) + symA} ⇒ ${valA}\${$harness.makeLiteral(${$r(id)})}${bkgr}]${fail}`,

                    right_value = `${bkgr}[${objB + $r(expr) + symA} ⇒ ${valB}\${$harness.makeLiteral(${$r(expr)})}${bkgr}]${fail}`;

                return {
                    message: `${fail}Assignment [${left_value} ${rst + node.symbol} ${right_value}] not allowed in assertion site`
                        + `\n    ${msgA}Should this have been an ${valD}Equality Expression${msgA} or ${valD}Relational Expression${msgA}?${fail}\n`,
                    highlight: [valA + $r(id), rst + node.symbol, fail + $r(expr) + rst + fail].join(" "),
                    match: node.pos.slice(),
                    column: expr.pos.column - node.symbol.length - 1,
                    line: expr.pos.line
                };
            },
        },
    ];

export default default_assertions_site_compilers;
