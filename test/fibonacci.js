import { Fibonacci as fib } from "./test_data/test_module.js";

"Fibonacci - 1 indexed";

"Fibonacci state 1";
((0 == fib(1)));

"Fibonacci state 2";
((1 == fib(2)));

"Fibonacci state 11";
((55 == fib(11)));

"Fibonacci state 12";
((89 == fib(12)));

"Fibonacci state 13";
((144 == fib(13)));

"Fibonacci state 18";
((1597 == fib(18)));

"Fibonacci state 29";
((317811 == fib(29)));

"Fibonacci state 33";
((2178309 == fib(33)));

"Fibonacci state 34";
((2178309 == fib(33)));

"Fibonacci state 35";
((5702887 == fib(35)));

"Fibonacci state 39";
((39088169 == fib(39)));
