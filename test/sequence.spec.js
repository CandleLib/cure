
{
    "Tests outside a SEQUENCE:{} relying on side effects of previous tests should fail"; "#";

    let i = 1;

    ((++i == 2));

    ((++i == 3));

    ((++i == 4));

    ((++i == 5));

    ((++i == 6));
}

SEQUENCE: {
    "Tests inside a SEQUENCE:{} relying on previous test side effects should pass"; "#";

    let i = 0;

    ((++i == 1));

    ((++i == 2));

    ((++i == 3));

    ((++i == 4));

    ((++i == 5));

    ((++i == 6));
}