

"Tests outside a sequence relying on side effects of previous tests should fail";

let i = 1;

assert(++i == 2);

assert(++i == 3);

assert(++i == 4);

assert(++i == 5);

assert(++i == 6);


assert_group(sequence, () => {
    "Tests inside a sequence relying on previous test side effects should pass";

    let i = 0;

    assert(++i == 1);

    assert(++i == 2);

    assert(++i == 3);

    assert(++i == 4);

    assert(++i == 5);

    assert(++i == 6);
});