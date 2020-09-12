import exp from "assert";

const a = 2;

assert_group("Group Name", function (d) {

    assert(2 == 1);

    assert(2 > 2);

    assert_group("Group Name 2", sequence, function (a) {

        exp();

        assert("test", 3 < d);

        assert(3 == a, browser);

    });
});


assert('test 3', 3 < 4, browser);

assert(a == 4);