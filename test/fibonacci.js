import { Fibonacci as fib } from "./test_data/test_module.js";

"Fibonacci - 1 indexed";

"Fibonacci state 1";
((0 == fib(1)));

"Fibonacci state 2";
((1 == fib(2)));

"Fibonacci state 3";
((1 == fib(3)));

"Fibonacci state 4";
((2 == fib(4)));

"Fibonacci state 5";
((3 == fib(5)));

"Fibonacci state 6";
((5 == fib(6)));

"Fibonacci state 7";
((8 == fib(7)));

"Fibonacci state 8";
((13 == fib(8)));

"Fibonacci state 21";
((6765 == fib(21)));

"Fibonacci state 29";
((317811 == fib(29)));

"Fibonacci state 33";
((2178309 == fib(3340)));