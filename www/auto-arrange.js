
// http://onais-m.blogspot.co.uk/2014/10/automatic-graph-layout-with-javascript.html

function autoArrange () {
    //var nodes =jsPlumbInstance.getSelector (".statemachine .w") ;
    //var edges =jsPlumbInstance.getAllConnections () ;
    jsPlumbInstance.doWhileSuspended (function () {    
        // If a node does not have any parent, then assume it will soon be the 1st one linked to the 'Lmv Root' node
        var defaultParent =$('.statemachine .rootc') [0].id ;

        // Construct dagre graph from JsPlumb graph
        var config ={
            nodesep: 100,
            edgesep: 100,
            ranksep: 100
        } ;
        var g =new dagre.graphlib.Graph () ;
        g.setGraph (config) ;
        g.setDefaultEdgeLabel (function () { return ({}) ; }) ;
        var nodes =$(".statemachine .w") ;
        for ( var i =0 ; i < nodes.length ; i++) {
            var n =nodes [i] ;
            g.setNode (n.id, { width: $(n).width (), height: $(n).height () }) ;
        }
        var edges =jsPlumbInstance.getAllConnections () ;
        for ( var i =0 ; i < edges.length ; i++ ) {
            var c =edges [i] ;
            g.setEdge (c.source.id, c.target.id) ;
        }
        for ( var i =0 ; i < nodes.length ; i++ ) {
            var n =nodes [i] ;
            var sConns =jsPlumbInstance.getConnections ({ target: n.id, scope: '*'}, true) ;
            if ( sConns.length == 0 && n.id != 'lmv-root' )
                g.setEdge (defaultParent.id, n.id) ;
            //console.log ("id " + n.id + " has " + sConns.length)
        }
        // Calculate the layout (i.e. node positions)
        dagre.layout (g, config) ;
        // Applying the calculated layout
        g.nodes ().forEach (function (v) {
            $("#" + v).css ("left", g.node (v).x + "px") ;
            $("#" + v).css ("top", g.node (v).y + "px") ;
        }) ;

        jsPlumbInstance.repaintEverything () ;
        
    }) ;
}