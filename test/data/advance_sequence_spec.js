
assert_group("candle.cure internal test", sequence, () => {

    let data = 2;

    assert("0 Basic built in assertion should pass", data + 2 == 4);

    assert_group("inner assert_group", () => {
        let data = 4;
        assert("inner assert_group has own closure", data + 2 == 6);

        assert_group(solo, "inner assert_group", () => {
            let data = 8;
            assert("inner assert_group has own closure", data + 2 == 10);
        });
    });

    assert("verify inner assert_group has own closure", data + 4 == 6);
});