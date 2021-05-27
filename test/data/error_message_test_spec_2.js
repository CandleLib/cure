import spark from "@candlelib/spark";

import { ExternalThrow } from "./external_throw.js";

const D = { fast_call: 2 };


function AThrowingFunction() { throw new Error("I've been waiting for this"); }


assert("9:53: Two different numbers are not the same", 1 == 2);

assert("11: Assignment expression error", D = 2);

assert("13: Object is not equal to number", D == 2);

assert("15: Object is not equal to number strict", D === 2);

assert("17: Invalid instanceof", 2 instanceof Boolean);

assert("19: Invalid typeof", typeof 2 == "string");

assert("21: Invalid more than", 1 > 2);

assert("23: Invalid more than equal", 1 >= 2);

assert("25: Invalid less than", 2 < 1);

assert("27: Invalid less than equal", 2 <= 1);

assert("29: This will time out", await spark.sleep(200000) == 0);

assert("31: This test will throw", AThrowingFunction());

assert("33: The function will throw", AThrowingFunction() == 2);

assert("37: The function will also throw", ExternalThrow() == 2);

assert("39: undefined", b == c);

console.log({ d: 2 });

assert("43: This test should pass even though there is a harness inspection (console.log)", 2 == 2);
