"Handles throw within test bindings";

const data = () => { throw new Error("Another Error"); };

"Implied Throw Arrow Function";
((() => { throw new Error("This error throws"); }));

"Implied Throw Function Variable";
((data));

"Explicit Throw";
(((() => { throw new Error("This error should throw"); })()));


