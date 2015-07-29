// ~~~~~~~~~~~~~~~~~~~~~~ Lambda_Calculus.js ~~~~~~~~~~~~~~~~~~~~~~
// A simple implementation of the λ-calculus written in JavaScript.
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
module.exports = (function lambda_calculus(){
    // A term is either a lambda, an application or a variable:
    //     data Term = Lam Term | App Term Term | Var Int

    var VAR = 1, LAM = 2, APP = 3;

    // Lam :: Term -> Term
    // Creates an abstraction.
    function Lam(body){ 
        return {type:LAM, body:body}; 
    };

    // App :: Term -> Term -> Term
    // The application of two terms.
    function App(left,right){ 
        return {type:APP, left:left, right:right};
    };

    // Var :: Int -> Term
    // A bruijn-indexed variable.
    function Var(index){ 
        return {type:VAR, index:index}; 
    };

    // reduce :: Term -> Term
    // Reduces a term to normal form. Will fail to terminate if the term isn't
    // strongly normalizing - that is, λ-combinator and similar absurds are banned.
    function reduce(term){
        switch (term.type){
            case VAR: return term;
            case LAM: return Lam(reduce(term.body));
            case APP: 
                var left  = reduce(term.left);
                var right = reduce(term.right);
                switch (left.type){
                    case LAM : return reduce(substitute(right, true, 0, -1, left.body));
                    case APP : return App(left,right);
                    default  : return App(left, right);
                };
        };
        function substitute(value, subs, depth, wrap, term){
            switch (term.type){
                case VAR: return subs && term.index === depth
                    ? substitute(Var(0), false, -1, depth, value)
                    : Var(term.index + (term.index > depth ? wrap : 0));
                case LAM: return Lam(substitute(value, subs, depth+1, wrap, term.body));
                case APP: return App(
                    substitute(value, subs, depth, wrap, term.left),
                    substitute(value, subs, depth, wrap, term.right));
            };
        };
    };

    // fold :: (Int -> a) -> (a -> a -> a) -> (a -> a) -> Term -> a
    function fold(var_,lam,app){
        return function R(term){
            switch (term.type){
                case VAR: return var_(term.index);
                case LAM: return lam(R(term.body));
                case APP: return app(R(term.left),R(term.right));
            };
        };
    };

    // nat :: Number -> Term
    // Converts a JavaScript number to a λ-calculus church number.
    function nat(x){
        return Lam(Lam((function go(x){return x===0?Var(0):App(Var(1),go(x-1))})(x)));
    };

    // nat_ :: Term -> Number
    // Converts a λ-calculus church number to a JavaScript number. 
    // TODO: do this decently.
    function nat_(x){
        return size(x)-1;
    };

    // print :: Term -> IO ()
    function print(x){
        console.log(pretty(x));
        return x;
    };

    // size :: Term -> Int
    // Number of variables on a λ-term. 
    // TODO: that isn't the usual definition of size, dumb.
    var size = fold(
        function(idx){ return 1; },
        function(body){ return body; },
        function(left,right){ return left+right; });

    // pretty :: Term -> String
    var pretty = fold(
        function(index){ return index; },
        function(body){ return "λ" + body; },
        function(left,right){ return "(" + left + " " + right + ")"; });

    // show :: Term -> String
    var show = fold(
        function(index){ return "Var(" + index + ")"; },
        function(body){ return "Lam(" + body + ")"; },
        function(left,right){ return "App(" + left + "," + right + ")"; });

    // Export a pattern-matching function instead. 
    // TODO: APP/LAM/VAR are internal tags and shouldn't be exported. 
    return {
        APP    : APP,
        LAM    : LAM,
        VAR    : VAR,
        Lam    : Lam,
        App    : App,
        Var    : Var,
        reduce : reduce,
        fold   : fold,
        nat    : nat,
        nat_   : nat_,
        print  : print,
        size   : size,
        pretty : pretty,
        show   : show};
})();

var lc = module.exports;
