let i = 0;

while (i < 4) {
    assert(name("While A" + i++), i == 2);
    assert(name("While B" + i++), i == 2);
}

for (var i = 0; i < 4; i++) {
    assert(name("For(;;) A" + i), i == 2);
    assert(name("For(;;) B" + i), i == 2);
}

for (const i of [0, 1, 2, 3]) {
    assert(name("For of A" + i), i == 2);
    assert(name("For of B" + i), i == 2);
}

do {
    assert(name("Do While A" + i++), i == 2);
    assert(name("Do While B" + i++), i == 2);
} while (i < 4);