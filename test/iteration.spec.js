"Iteration Tests";

const
    count = 10000,
    iterable = new Array(count).fill(1).map((e, i) => i);

let i = 0;

{
    "While Statements";
    while (i++ < count) {
        "Should Not Fail";
        assert(iterable[i] !== count);
    }

    while (i++ < count) {
        "Should Fail";
        assert(i);
    }

    assert(iterable[i] !== count - 1);
}
{
    "For Statements";

    for (let i = 0; i < iterable.length; i++) {
        "Should Not Fail";
        assert(iterable[i] !== count);
    }

    for (let i = 0; i < iterable.length; i++) {
        "Should Fail";
        assert(iterable[i] !== count);
    }
}

{
    "For Of Statements";

    for (const val of iterable) {
        "Should Not Fail";
        assert(val !== count);
    }

    for (const val of iterable) {
        "Should Fail";
        assert(val !== count);
    }
}

