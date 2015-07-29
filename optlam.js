// ~~~~~~~~~~~~~~~~~~~~~~ Optlam.js ~~~~~~~~~~~~~~~~~~~~~~
// An optimal λ-calculus normalizer written in JavaScript.
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Optlam.js is a simple, optimal (in Levy's sense) λ-calculus evaluator using
// interaction nets. It uses Lamping's Abstract Algorithm - that is, the so
// called (and problematic) "oracle" is avoided altogether. As such, it is only
// capable of computing λ-terms that are typeable on Elementary Affine Logic.
// As far as it concerns λ-wiki, it seems that most terms that matter are on
// that subset, so this could perhaps be considered an optimization. Yet, being
// optimal doesn't mean it is fast - it is implemented in JavaScript, after
// all. But it is asymptotically faster than naive evaluators and is actually
// (and surprisingly) the fastest λ normalizer around, as far as I'm aware. Better
// implementations would be great, and there is a lot of potential to explore
// parallel (GPU/ASIC?) implementations. The API is very simple, consisting of
// one function, `reduce`, which receives a bruijn-indexed, JSON-encoded λ
// calculus term and returns its normal form.
// USAGE : `optlam.reduce(App(Lam(Var(0)),Lam(Var(0))))`  

var lambda = require("./lambda_calculus.js");

module.exports = (function(){
    // Node types. Each node has 3 ports, where
    // the first port is the active one, and with
    // the following semantical configuration:
    // type port0   port1   port2
    // ROT  down    n/a     n/a
    // APP  func    arg     up
    // LAM  up      var     body
    // DUP  target  left    right
    // ERA  up      n/a     n/a
    var ROT = 0, LAM = 1, APP = 2, DUP = 4, ERA = 5;

    // The app's state: 
    // `next_id` : next id to be allocated. 
    // `memory`  : the memory buffer.
    // `garbage` : index of collected nodes (to be reclaimed).
    var next_id = 0;
    var memory  = [];
    var garbage = [];

    // Statistics: updated whenever `net_reduce` is called.
    // `iterations`   : number of times a node was visited on the reduction.
    // `applications` : how many times a rule was applied (commute or annihilate).
    // `used_memory`  : number of allocated memory cells (on JS, a cell is a `double`).
    var stats = {
        iterations   : 0,
        applications : 0,
        used_memory  : 0};

    // Node :: Int -> Int -> IO Int
    // Allocates space for a node of given type (ROT/LAM/APP/DUP/ERA)
    // and an integer tag. The type is used on the readback, and the tag is
    // used for reductions: when active ports meet, a pair will commute if 
    // their tags are different and annihilate if their tags are identical.
    // Returns the index on memory on which the node was allocated.
    function Node(type,tag){
        var idx = garbage.pop() || memory.length;
        memory[idx+0] = type;      // Node type (used on readback)
        memory[idx+1] = 0;         // Port 0 target port
        memory[idx+2] = 0;         // Port 1 target port
        memory[idx+3] = 0;         // Port 2 target port
        memory[idx+4] = 0;         // Port 0 target node
        memory[idx+5] = 0;         // Port 1 target node
        memory[idx+6] = 0;         // Port 2 target node
        memory[idx+7] = ++next_id; // Unique id
        memory[idx+8] = tag;       // Tag (used to decide which reduction rule apply)
        stats.used_memory = memory.length;
        return idx;
    };

    // get_target_port :: Int -> Int -> Int
    // Returns which port on the target node that this port is connected to.
    function get_target_port(node,port){
        return memory[node+1+port];
    };

    // get_target :: Int -> Int -> Int
    // Returns the target node that this port is connected to.
    function get_target(node,port){
        return memory[node+4+port];
    };

    // half_link :: Int -> Int -> Int -> Int -> IO ()
    // Links (one-way) `node`'s port `port` to `target`'s port `target_port`.
    function half_link(node,port,target,target_port){
        memory[node+1+port] = target_port;
        memory[node+4+port] = target;
    };

    // get_id :: Int -> Int
    // Returns a node's id.
    function get_id(node){
        return memory[node+7];
    };

    // get_tag :: Int -> Int
    // Returns a node's tag (used to decide which rule to apply on active pairs).
    function get_tag(node){
        return memory[node+8];
    };

    // get_type :: Int -> Int
    // Returns a node's type (used for decoding - possibly redundant).
    function get_type(node){
        return memory[node];
    };

    // link :: Int -> Int -> Int -> Int -> IO ()
    // Two-way link between two nodes's ports.
    function link(a_target,a_port,b_target,b_port){
        half_link(a_target,a_port,b_target,b_port);
        half_link(b_target,b_port,a_target,a_port);
    };

    // annihilate :: Int -> Int -> IO ()
    // Annihilates two nodes. This rule is used wen
    // two nodes of identical tags collide.
    //  arg          bod              arg     bod
    //   \            /                   \ / 
    //     APP -- LAM       -->            X  
    //   /            \                   / \ 
    //  ret          var              ret     var
    function annihilate(a,b){
        link(get_target(a,1),get_target_port(a,1),get_target(b,1),get_target_port(b,1));
        link(get_target(a,2),get_target_port(a,2),get_target(b,2),get_target_port(b,2));
        garbage.push(a,b);
    };

    // commute :: Int -> Int -> IO ()
    // Commutes two nodes. This rule is used when
    // two nodes of different tags collide.
    //  a              d          a - NOD --- DUP - d
    //   \            /                   \ /
    //     DUP -- NOD       -->            X 
    //   /            \                   / \
    //  b              c          b - NOD --- DUP - c 
    function commute(dup,nod){
        var dup_b = Node(get_type(dup), get_tag(dup));
        var nod_b = Node(get_type(nod), get_tag(nod));
        link(nod,0,get_target(dup,1),get_target_port(dup,1));
        link(dup,0,get_target(nod,1),get_target_port(nod,1));
        link(nod,1,dup,1);
        link(nod_b,0,get_target(dup,2),get_target_port(dup,2));
        link(dup_b,0,get_target(nod,2),get_target_port(nod,2));
        link(dup,2,nod_b,1);
        link(nod,2,dup_b,1);
        link(nod_b,2,dup_b,2);
    };

    // net_encode :: Term -> Node
    // Converts a λ-calculus term to an interaction net.
    // Receives the λ-calculus term and returns the pointer to the root node
    // of the created interaction-net.
    function net_encode(root){
        function Link(target, port){
            return {target : target, port : port};
        };
        var next_tag = 0;
        var net_root = Node(ROT, -1);
        function net_encode(node,scope,up_link){
            switch (node.type){
                case lambda.LAM: 
                    var del = Node(ERA, -1);
                    var lam = Node(LAM, 0);
                    half_link(lam,0,up_link.target,up_link.port);
                    link(lam,1,del,0);
                    link(del,1,del,2);
                    var bod = net_encode(node.body,[lam].concat(scope),Link(lam,2));
                    half_link(lam,2,bod.target,bod.port);
                    return Link(lam,0);
                case lambda.APP:
                    var app = Node(APP, 0);
                    half_link(app,2,up_link.target,up_link.port);
                    var left = net_encode(node.left,scope,Link(app,0));
                    half_link(app,0,left.target,left.port);
                    var right = net_encode(node.right,scope,Link(app,1));
                    half_link(app,1,right.target,right.port);
                    return Link(app,2);
                case lambda.VAR:
                    var idx = node.index;
                    var lam = scope[idx];
                    if (get_type(get_target(lam,1)) === ERA){
                        half_link(lam,1,up_link.target,up_link.port);
                        return Link(lam,1);
                    } else {
                        var dup = Node(DUP, ++next_tag);
                        half_link(dup,0,lam,1);
                        half_link(dup,1,up_link.target,up_link.port);
                        half_link(dup,2,get_target(lam,1),get_target_port(lam,1));
                        half_link(get_target(lam,1),get_target_port(lam,1),dup,2);
                        half_link(lam,1,dup,0);
                        return Link(dup,1);
                    };
            };
        };
        var encoded_link = net_encode(root,[],Link(net_root,0));
        half_link(net_root,0,encoded_link.target,encoded_link.port);
        return net_root;
    };

    // net_decode :: Node -> Term
    // Converts an interaction net back to a λ-calculus term. 
    // Receives the pointer to the root node of the net and returns the λ-term.
    // This function uses a manual stack for recursion in order to avoid stack 
    // overflows and to enable tail call optimization for one of its branches.
    function net_decode(root){
        var stack = [];
        var retur = null;
        var index = -1;
        function CALL(node,port,depth,exit){
            stack[index+1] = {cont:0, node:node, port:port, depth:depth, exit:exit, left:null};
            ++index;
        };
        function TAIL_CALL(node,port,depth,exit){
            var s = stack[index];
            s.cont=0, s.node=node, s.port=port, s.depth=depth, s.exit=exit, s.left=null;
        };
        function RETURN(val){
            retur = val;
            --index;
        };
        function Cons(head,tail){
            return {head:head, tail:tail};
        };
        var go_link;
        var node_depth = {};
        CALL(get_target(root,0), get_target_port(root,0), 0, null);
        while (index>=0){
            var st = stack[index];
            switch(st.cont){
                case 0:
                    if (node_depth[get_id(st.node)] === undefined)
                        node_depth[get_id(st.node)] = st.depth;
                    switch(get_type(st.node)){
                        case DUP: 
                            go_link = st.port>0?0:st.exit.head;
                            st.exit = st.port ? Cons(st.port,st.exit) : st.exit.tail;
                            TAIL_CALL(get_target(st.node,go_link), get_target_port(st.node,go_link), st.depth, st.exit);
                        continue;
                        case LAM: 
                            if (st.port === 1){
                                RETURN(lambda.Var(st.depth - node_depth[get_id(st.node)] - 1));
                            } else {
                                CALL(get_target(st.node,2), get_target_port(st.node,2), st.depth+1, st.exit);
                                st.cont = 1;
                            };
                        continue;
                        case APP: 
                            CALL(get_target(st.node,0), get_target_port(st.node,0), st.depth, st.exit);
                            st.cont = 2;
                        continue;
                    }
                continue;
                case 1: RETURN(lambda.Lam(retur)); continue;
                case 2:
                    st.left = retur;
                    CALL(get_target(st.node,1), get_target_port(st.node,1), st.depth, st.exit);
                    st.cont = 3;
                continue;
                case 3: RETURN(lambda.App(st.left, retur)); continue;
            };
        };
        return retur;
    };

    // net_reduce :: IO ()
    // Reduces an interaction net to normal form.
    // Instead of applying rules in parallel with no ordering,
    // we walk through the net from the root through the net's
    // circuit, only traversing visible branches. That is done
    // in order to avoid unecessary computation. For example,
    // the term `(bool.true 1 (nat.div 10000 10000))` has many
    // active pairs that aren't necessary for the final result
    // at all, since they are in an unreachable branch. This
    // strategy allows us to skip those pairs.
    function net_reduce(net){
        stats.applications = 0;
        stats.iterations   = 0;
        var solid          = {};
        var exit           = {};
        var visit          = [[net,0]];
        loop1:
        while (visit.length > 0){
            var next        = visit.pop();
            var next_target = get_target(next[0],next[1]);
            var next_port   = get_target_port(next[0],next[1]);
            while (next_target!==undefined){
                ++stats.iterations;
                var exit_target;
                var prev_target = get_target(next_target,next_port);
                var prev_port   = get_target_port(next_target,next_port);
                if (solid[get_id(next_target)]) continue loop1;
                if (next_port === 0){
                    if (prev_port === 0 && get_tag(prev_target) !== -1 && get_tag(next_target) !== -1){ 
                        ++stats.applications;
                        exit_target = get_target(prev_target,exit[get_id(prev_target)]);
                        exit_port   = get_target_port(prev_target,exit[get_id(prev_target)]);
                        if (get_tag(prev_target) === get_tag(next_target))
                            annihilate(prev_target,next_target);
                        else 
                            commute(prev_target,next_target);
                        next_target = get_target(exit_target,exit_port);
                        next_port   = get_target_port(exit_target,exit_port);
                    } else {
                        solid[get_id(next_target)] = true;
                        visit.push([next_target,2],[next_target,1])
                        continue loop1;
                    };
                } else {
                    exit[get_id(next_target)] = next_port;
                    next_port   = get_target_port(next_target,0);
                    next_target = get_target(next_target,0);
                };
            };
        };
        return net;
    };

    // clear :: IO ()
    // Completely wipes all local data. 
    // Previously returned pointers/nets are now invalid.
    function clean(){
        next_id            = 0;
        memory             = [];
        garbage            = [];
        stats.iterations   = 0;
        stats.applications = 0;
        stats.used_memory  = 0;
    };

    // reduce :: Term -> Term
    // The main API. Receives a λ-calculus term and returns its normal form.
    function reduce(term){
        clean();
        return net_decode(net_reduce(net_encode(term)));
    };
    return {
        reduce     : reduce,
        net_encode : net_encode,
        net_decode : net_decode,
        net_reduce : net_reduce,
        stats      : stats};
})();
