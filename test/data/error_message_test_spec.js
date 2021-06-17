import spark from "@candlelib/spark";

const D = { fast_call: 2 };

function AThrowingFunction() { throw new Error("I've been waiting for this"); }


//1
assert("9:53: Two different numbers are not the same", 1 == 2);
//2
assert("11: Assignment expression error", D = 2);
//3
assert("13: Object is not equal to number", D == 2);
//4
assert("15: Object is not equal to number strict", D === 2);
//5
assert("17: Invalid instanceof", 2 instanceof Boolean);
//6
assert("19: Invalid typeof", typeof 2 == "string");
//7
assert("21: Invalid more than", 1 > 2);
//8
assert("23: Invalid more than equal", 1 >= 2);
//9
assert("25: Invalid less than", 2 < 1);
//10
assert("27: Invalid less than equal", 2 <= 1);
//11
assert(5, "29: This will time out", await spark.sleep(10) == 0);
//12
assert("31: This test will throw", AThrowingFunction() == 2);
//13
assert("33: undefined", b == c);

console.log({ d: 2 });
//14
assert("37: This test should pass even though there is a harness inspection (console.log)", 2 == 2);
