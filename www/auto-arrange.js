//
// Copyright (c) Autodesk, Inc. All rights reserved 
//
// Node.js server workflow 
// by Cyrille Fauvel - Autodesk Developer Network (ADN)
// January 2015
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted, 
// provided that the above copyright notice appears in all copies and 
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting 
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS. 
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC. 
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
//

/* jsplumb */
// http://onais-m.blogspot.co.uk/2014/10/automatic-graph-layout-with-javascript.html

function autoArrange () {
    //var nodes =jsPlumbInstance.getSelector (".statemachine .w") ;
    //var edges =jsPlumbInstance.getAllConnections () ;
    jsPlumbInstance.doWhileSuspended (function () {    
        // If a node does not have any parent, then assume it will soon be the 1st one linked to the 'Lmv Root' node
        var defaultParent =$('.statemachine .rootc') [0].id ;

        // Construct dagre graph from JsPlumb graph
        var config ={
            nodesep: 50,
            edgesep: 20,
            ranksep: 60
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
            if ( sConns.length == 0 && n.id != 'lmv-root' ) {
				jsPlumbInstance.connect ({ source: defaultParent, target: n.id }) ;
                g.setEdge (defaultParent, n.id) ;
			}
        }
        // Calculate the layout (i.e. node positions)
        dagre.layout (g, config) ;
        // Applying the calculated layout
		var box ={ left: 1000000, top: 10000000, right: 0, bottom: 0 } ;
		g.nodes ().forEach (function (v) {
			box.left =Math.min (g.node (v).x, box.left) ;
			box.right =Math.max (g.node (v).x, box.right) ;
			box.top =Math.min (g.node (v).y, box.top) ;
			box.bottom =Math.max (g.node (v).y, box.bottom) ;
		}) ;
		var offset =400 - (box.right - box.left) / 2 ;
        g.nodes ().forEach (function (v) {
            $("#" + v).css ("left", (g.node (v).x + offset) + "px") ;
            $("#" + v).css ("top", g.node (v).y + "px") ;
        }) ;

        //jsPlumbInstance.repaintEverything () ;
    }) ;
}
