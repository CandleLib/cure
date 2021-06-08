import { exp, JSAssignmentExpression, JSAwaitExpression, JSCallExpression, JSEqualityExpression, JSInstanceOfExpression, JSNode, JSNodeClass, JSNodeType, JSRelationalExpression, JSUnaryExpression, renderCompressed as $r } from "@candlelib/js";
import { fail, rst, valA } from "../../reporting/utilities/colors.js";
import { ExpressionHandler } from "../../types/expression_handler";

function sanitizeTemplate(string) {
    return string;
}


const
    $ = sanitizeTemplate;

export const default_expression_handlers: ExpressionHandler<JSNode>[] = [

    /**
     * Relational and Equality Expressions
     */
    <ExpressionHandler<JSEqualityExpression | JSRelationalExpression>>{

        filter: JSNodeClass.BINARY_EXPRESSION,

        confirmUse: (node) => node.type == JSNodeType.EqualityExpression || node.type == JSNodeType.RelationalExpression,

        build: (node, queue) => {
            const [left, right] = node.nodes;

            queue.push(`"${$r(left).replace(/\"/g, "\\\"")}"`);
            const a = queue.push(left); // Push an expression to the evaluation stack
            queue.push(`"${$r(right).replace(/\"/g, "\\\"")}"`);
            const b = queue.push(right);
            queue.push(`'${node.symbol.replace(/\"/g, "\\\"")}'`);
            const e = queue.evaluate(`${a} ${node.symbol} ${b}`);
            queue.report(e);
        },

        print: (queue, reporter) => {

            const

                [left_code, left_val, right_code, right_val, symbol] = [...queue.shift()],

                symbol_to_phrase_map = {
                    "==": "to equal",
                    "!=": "to not equal",
                    "===": "to strictly equal",
                    "!==": "to strictly not equal",
                    ">=": "to be more than or equal to",
                    "<=": "to be less than or equal to",
                    ">": "to be more than",
                    "<": "to be less than"
                };

            return [
                ...(`Expected ${left_code}=[${left_val}]`).split("\n"),
                symbol_to_phrase_map[<string>symbol] ?? "something something" + symbol,
                ...(`${right_code}=[${right_val}]`).split("\n")
            ];
        },
    },
    /**
    * Instance of Expression
    */
    <ExpressionHandler<JSInstanceOfExpression>>{

        filter: JSNodeType.InstanceOfExpression,

        confirmUse: _ => true,

        build: (node, queue) => {
            const [left, right] = node.nodes;

            queue.push(`"${$r(left).replace(/\"/g, "\\\"")}"`);
            const a = queue.push(left); // Push an expression to the evaluation stack
            queue.push(`"${$r(right).replace(/\"/g, "\\\"")}"`);
            const b = queue.push(right);
            const e = queue.evaluate(`${b} ==== ${a}`);
            queue.report(e);
        },

        print: (queue, reporter) => {
            return [];
        },
    },

    /**
    * Call Expression [ call() ]  Should Not Throw
    */
    <ExpressionHandler<JSCallExpression>>{

        filter: JSNodeType.CallExpression,

        confirmUse: _ => true,

        build: (node, queue) => {
            const
                [name, args] = node.nodes,
                str = queue.push(`"${$r(name).replace(/\"/g, "\\\"")}"`),
                fn = queue.push(name),
                vars = args.nodes.map(arg => queue.push(arg)),
                first = fn, last = vars.pop();

            queue.report(`noThrow{${first},${last || first}}`);
        },

        print: (queue, reporter) => {
            return ["Expected function to not throw"];
        },
    },

    /**
    * Negated Call Expression [ !call() ] Should Throw
    */
    <ExpressionHandler<JSUnaryExpression>>{

        filter: JSNodeType.UnaryExpression,

        confirmUse: _ => _.symbol == "!" && (_.nodes[0].type == JSNodeType.CallExpression),

        build: (node, queue) => {
            const
                [name, args] = (<JSCallExpression>node.nodes[0]).nodes,
                str = queue.push(`"${$r(name).replace(/\"/g, "\\\"")}"`),
                fn = queue.push(name),
                vars = args.nodes.map(arg => queue.push(arg)),
                first = fn, last = vars.pop();

            queue.report(`!{${first},${last || first}}`);
        },

        print: (queue, reporter) => {
            const [name] = [...queue.shift()];
            return [`Expected function ${name} to throw`];
        },
    },

    /**
   * Negated await Expression [ !await call() ] Should Throw
   */
    <ExpressionHandler<JSUnaryExpression>>{

        filter: JSNodeType.UnaryExpression,

        confirmUse: _ => _.symbol == "!" && (_.nodes[0].type == JSNodeType.AwaitExpression),

        build: (node, queue) => {
            const
                [name, args] = (<JSCallExpression>node.nodes[0].nodes[0]).nodes,
                str = queue.push(`"${$r(name).replace(/\"/g, "\\\"")}"`),
                fn = queue.push(name),
                vars = args.nodes.map(arg => queue.push(arg)),
                first = fn, last = vars.pop();

            queue.report(`!{${first},${last || first}}`);
        },

        print: (queue, reporter) => {
            const [name] = [...queue.shift()];
            return [`Expected function ${name} to throw`];
        },
    },

    /**
    * Await Expression [ await call() ] Should not throw
    */
    <ExpressionHandler<JSAwaitExpression>>{

        filter: JSNodeType.AwaitExpression,

        confirmUse: _ => true,

        build: (node, queue) => {
            const
                [name, args] = (<JSCallExpression>node.nodes[0]).nodes,
                str = queue.push(`"${$r(name).replace(/\"/g, "\\\"")}"`),
                fn = queue.push(name),
                vars = args.nodes.map(arg => queue.push(arg)),
                first = fn, last = vars.pop();

            queue.report(`noThrow{${first},${last || first}}`);
        },

        print: (queue, reporter) => {
            return ["Expected function to not throw"];
        },
    },

    /**
    * Assignment should throw
    */
    <ExpressionHandler<JSAssignmentExpression>>{

        filter: JSNodeType.AssignmentExpression,

        confirmUse: _ => _.type == JSNodeType.AssignmentExpression,

        build: (node, queue) => {
            queue.push(`"${$r(node.nodes[0]).replace(/\"/g, "\\\"")}"`);
            queue.push(`"${node.symbol.replace(/\"/g, "\\\"")}"`);
            queue.push(`"${$r(node.nodes[1]).replace(/\"/g, "\\\"")}"`);
            queue.report(`${queue.push(exp("false"))}`);
        },

        print: (queue, reporter) => {
            const [left, sym, right] = [...queue.shift()];
            return [`Invalid use of assignment expression [${valA + left + fail + ` ${sym} ` + valA + right + rst}] in assertion site`];
        },
    }
];

export default default_expression_handlers;
