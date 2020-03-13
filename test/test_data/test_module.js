const Fibonacci = (size) => {

    if (size - 1 <= 1)
        return size - 1;

    return Fibonacci(--size) + Fibonacci(--size);
};

export { Fibonacci };