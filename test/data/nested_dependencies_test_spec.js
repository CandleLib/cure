import { A1, A2, B } from "A";
import ext_map from "B";
import { R } from "B";
import D, { E as A, F as log } from "C";


const
    YY = () => D(ext_map),
    BB = (s = A1(A2)) => s();

function callAandB(a, b) {

    function G() {
        log();
        YY();
    }

    A(b);
    B() + b;
    a();
    G();
}

assert(callAandB(R, BB(D)) == null);