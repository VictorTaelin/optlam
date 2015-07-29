// Require the needed libraries
optlam = require("./optlam.js");
lambda = require("./lambda_calculus.js");

// Shortcuts (A = apply, L = lambda, V = bruijn indexed variable)
var A = lambda.App, L = lambda.Lam, V = lambda.Var, n = lambda.nat, n_ = lambda.nat_;

// An exponential modulus implementation for church numbers is:
// (λabc.(c(λde.(d(λf.(e(λgh.(g(fgh)))f))))(λd.(d(λef.f)))(λd.(ba(c(λefg.(e(λh.(fhg))))(λe.e)(λef.(fe)))(c(λef.e)(λe.e)(λe.e))))))
// It receives three church numbers, `a`, `b`, `c`, and returns `a^b%c`.
// I don't have a parser yet, so lets create this term manually:
var exp_mod = L(L(L(A(A(A(V(0),L(L(A(V(1),L(A(A(V(1),L(L(A(V(1),A(A(V(2),V(1)),V(0)))))),V(0))))))),L(A(V(0),L(L(V(0)))))),L(A(A(A(V(2),V(3)),A(A(A(V(1),L(L(L(A(V(2),L(A(A(V(2),V(0)),V(1)))))))),L(V(0))),L(L(A(V(0),V(1)))))),A(A(A(V(1),L(L(V(1)))),L(V(0))),L(V(0)))))))))

// With that, this term now computes `100 ^ 100 % 31`.
var term = A(A(A(exp_mod,n(100)),n(100)),n(31));

// We use optlam to reduce the term, not lambda (which has a naive evaluator
// that wouldn't finish any soon).  lambda.nat_ reads a church number back to a
// JS number. You could use lambda.pretty instead if you feel like today is a
// good day for counting.
console.log(lambda.nat_(optlam.reduce(term)));
console.log(optlam.stats);

