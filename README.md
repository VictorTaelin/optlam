## Optlam.js

An optimal function evaluator written in JavaScript. (Note: there is a slightly cleaner but slower and undocumented version [here](https://github.com/MaiaVictor/LPU/blob/master/src/lamnet.js), I recommend reading it if you just want to understand/port the algorithm.

## About

Optlam.js is a simple, optimal (in Levy's sense) λ-calculus evaluator using interaction nets. It is, currently, as far as I know, the fastest implementation of functions in the world. It uses Lamping's Abstract Algorithm - that is, the so called (and problematic) "oracle" is avoided altogether. As such, it is only capable of computing λ-terms that are typeable on Elementary Affine Logic. This includes most functions that you'd use in practice, but isn't powerful enough to process, for example, an unhalting turing machine. Notice being optimal doesn't mean it is efficient - it is implemented in JavaScript, after all. Nether less, it is still asymptotically faster than most evaluators, being able to quickly normalize functions that [even Haskell would take years](http://stackoverflow.com/questions/31707614/why-are-%CE%BB-calculus-optimal-evaluators-able-to-compute-big-modular-exponentiation). Improved implementations would be great, and there is a lot of potential to explore parallel (GPU/ASIC?) processing. The API is very simple, consisting of one function, `reduce`, which receives a bruijn-indexed, JSON-encoded λ calculus term and returns its normal form. See [this image](http://i.imgur.com/CSjrhsX.jpg) for an overall idea of how the magic works.

## Example

What is the result of:

    (function (a){ return function(b){ return a; } })(1)(2);

Using node.js, you can find it is `1`. Now, what is the result of:

    expMod = (function (v0) { return (function (v1) { return (function (v2) { return (((((((function(n){return(function(f){return(function(a){ for (var i=0;i<n;++i)a=f(a);return(a)})})})(v2))((function (v3) { return (function (v4) { return (v3((function (v5) { return ((v4((function (v6) { return (function (v7) { return (v6(((v5(v6))(v7)))) }) })))(v5)) }))) }) })))((function (v3) { return (v3((function (v4) { return (function (v5) { return v5 }) }))) })))((function (v3) { return (((((function(n){return(function(f){return(function(a){ for (var i=0;i<n;++i)a=f(a);return(a)})})})(v1))(((function(n){return(function(f){return(function(a){ for (var i=0;i<n;++i)a=f(a);return(a)})})})(v0))))((((((function(n){return(function(f){return(function(a){ for (var i=0;i<n;++i)a=f(a);return(a)})})})(v2))((function (v4) { return (function (v5) { return (function (v6) { return (v4((function (v7) { return ((v5(v7))(v6)) }))) }) }) })))((function (v4) { return v4 })))((function (v4) { return (function (v5) { return (v5(v4)) }) })))))((((((function(n){return(function(f){return(function(a){ for (var i=0;i<n;++i)a=f(a);return(a)})})})(v2))((function (v4) { return (function (v5) { return v4 }) })))((function (v4) { return v4 })))((function (v4) { return v4 }))))) })))((function (v3) { return (v3+1) })))(0)) }) }) })

    console.log(expMod(10)(10)(2));

That JavaScript program uses [church-encoded](https://en.wikipedia.org/wiki/Church_encoding) natural numbers to compute `10^10%2` - that is, the exponential modulus. The result should be `0`, but `node.js` takes too long to compute it because **it doesn't implement functions optimally**. Thus, if you really need that answer, you can encode your function on the [lambda-calculus](https://en.wikipedia.org/wiki/Lambda_calculus) and use `optlam.js` to find it for you:

    -- expMod on the lambda calculus
    expMod = (λabc.(c(λde.(d(λf.(e(λgh.(g(fgh)))f))))(λd.(d(λef.f)))(λd.(ba(c(λefg.(e(λh.(fhg))))(λe.e)(λef.(fe)))(c(λef.e)(λe.e)(λe.e))))))

    -- The computation we want
    main = expMod 10 10 2

This correctly outputs `0`.

## How do I use it?

The API right now is actually non-existent, but check the `test.js` file for the `expMod` example. You can run it with `node.js`:

    node test.js

Outputs:

    25
    { iterations: 2579187,
    applications: 1289514,
    used_memory: 5938470 }

Which is `100 ^ 100 % 31`. In a few days I might update this with a proper parser/pretty-printer and command line tool.

## Why don't other languages implement functions optimally?

As important as functions are for programming in general, no common language implements them optimally. A wide range of algorithms is used, but all are asymptotically suboptimal. Not even the so-called "functional", pure, lazy languages (i.e., Haskell) do it. The reason is most real-world programming rarely needs it. The difference can only be noticed in functions much more complex than what you'd write normally, and we already have very efficient algorithms for those simpler functions.

## How does it work?

It uses Lamping's "Abstract Algorithm", as explained on the [The Optimal Implementation of Functional Programming Languages](http://www.cs.unibo.it/pub/asperti/book.ps.gz) book, by Andrea Asperti and Stefano Guerrini. It does **not** implement the so-called (and problematic) "Oracle" - that is, no croissants nor brackets are used - so it actually only works on a subset of λ-terms that are [elementary-affine-logic typeable](https://www.google.com.br/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&cad=rja&uact=8&sqi=2&ved=0CCIQFjAAahUKEwi9iqmQioHHAhWB7YAKHSu1AIg&url=http%3A%2F%2Ftocl.acm.org%2Faccepted%2Fcoppola.ps&ei=Dyq5Vf3GG4HbgwSr6oLACA&usg=AFQjCNHyttke6hpkbC6hclM-htxhvNQp1A&sig2=CyOfKgqyXUA85UlEQuZ7Qw&bvm=bv.99028883,d.eXY). In practice, I couldn't find any interesting λ-term that wasn't EAL-typeable, so I chose to avoid the oracle altogether. Also, instead of applying rules nondeterministically in parallel, a cursor runs through the graph sequentially, avoiding unreachable branches. I'm not sure this was proposed on literature.

## What is this actually useful for?

Not much, right now. It is optimal, but not terribly efficient (it is written in JavaScript, after all). I don't know if there is something *practical* Optlam, as is, could do that couldn't be done faster with alternative known algorithms. But it is something new that enables some things that weren't possible before, and has a lot of potential that deserves be explored. For example, the algorithm can be effortlessly distributed through hundreds of processing cores, but JavaScript can't even spawn threads.
