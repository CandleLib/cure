assert_group("Level 1", function () {

    assert(1 == 4);

    assert_group("Level 2", function () {

        assert(5 == 6);

        assert_group("Level 3-A", function () {

            assert(5 == 7);

            assert_group("Level 4-A Sequenced", sequence, function () {

                assert(5 == 7);

                assert(5 == 7);

                assert(5 == 7);
            });
        });

        assert_group("Level 3-B", function () {

            assert(5 == 7);

            assert_group("Level 4-B", function () {

                assert(5 == 7);
            });

        });
    });
})