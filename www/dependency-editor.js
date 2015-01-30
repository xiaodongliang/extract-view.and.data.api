var jsPlumbInstance =null ;

jsPlumb.ready (function () {
	// setup some defaults for jsPlumb.
    jsPlumbInstance =jsPlumb.getInstance ({
		Endpoint: [ "Dot", { radius: 2 } ],
		HoverPaintStyle: {strokeStyle: "#1e8151", lineWidth: 2 },
		ConnectionOverlays: [
			[ "Arrow", {
				location: 1,
				id: "arrow",
                length: 14,
                foldback: 0.8
			}]
            //[ "Label", { label: "FOO", id: "label", cssClass: "aLabel" }]
		],
		Container: "dependencies-editor-area"
	}) ;

    window.jsp =jsPlumbInstance ;

	var windows =jsPlumb.getSelector (".statemachine .w") ;
	jsPlumbInstance.draggable (windows, { containment: "dependencies-editor-area" }) ; // initialize draggable elements.
    jsPlumb.recalculateOffsets ("dependencies-editor-area") ;

    // Bind a click listener to each connection; the connection is deleted. you could of course
	// just do this: jsPlumb.bind("click", jsPlumb.detach), but I wanted to make it clear what was
	// happening.
	jsPlumbInstance.bind ("click", function (c) {
		jsPlumbInstance.detach (c) ;
	}) ;

	// Bind a connection listener. note that the parameter passed to this function contains more than
	// just the new connection - see the documentation for a full list of what is included in 'info'.
	// this listener sets the connection's internal
	// id as the label overlay's text.
    jsPlumbInstance.bind ("connection", function (info) {
		//info.connection.getOverlay ("label").setLabel (info.connection.id) ;
    }) ;

	// suspend drawing and initialise.
	jsPlumbInstance.doWhileSuspended (function () {
		var isFilterSupported =jsPlumbInstance.isDragFilterSupported () ;
		// make each ".ep" div a source and give it some parameters to work with.  here we tell it
		// to use a Continuous anchor and the StateMachine connectors, and also we give it the
		// connector's paint style.  note that in this demo the strokeStyle is dynamically generated,
		// which prevents us from just setting a jsPlumb.Defaults.PaintStyle.  but that is what i
		// would recommend you do. Note also here that we use the 'filter' option to tell jsPlumb
		// which parts of the element should actually respond to a drag start.
		// here we test the capabilities of the library, to see if we
		// can provide a `filter` (our preference, support by vanilla
		// jsPlumb and the jQuery version), or if that is not supported,
		// a `parent` (YUI and MooTools). I want to make it perfectly
		// clear that `filter` is better. Use filter when you can.
		if ( isFilterSupported ) {
			jsPlumbInstance.makeSource (windows, {
				filter: ".ep",
				anchor: "Continuous",
				connector: [ "StateMachine", { curviness: 20 } ],
				connectorStyle: { strokeStyle: "#5c96bc", lineWidth: 2, outlineColor: "transparent", outlineWidth: 4 }
				//maxConnections: 5,
				//onMaxConnections: function (info, e) {
				//	alert ("Maximum connections (" + info.maxConnections + ") reached") ;
				//}
			}) ;
		} else {
			var eps =jsPlumb.getSelector (".ep") ;
			for ( var i =0 ; i < eps.length ; i++ ) {
				var e =eps [i], p =e.parentNode ;
				jsPlumbInstance.makeSource (e, {
					parent: p,
					anchor: "Continuous",
					connector: [ "StateMachine", { curviness: 20 } ],
					connectorStyle: { strokeStyle: "#5c96bc", lineWidth: 2, outlineColor: "transparent", outlineWidth: 4 }
					//maxConnections: 5,
					//onMaxConnections: function (info, e) {
					//	alert ("Maximum connections (" + info.maxConnections + ") reached") ;
					//}
				}) ;
			}
		}
	}) ;

	// Initialize all '.w' elements as connection targets.
	/*jsPlumbInstance.makeTarget (windows, {
		dropOptions: { hoverClass: "dragHover" },
		anchor: "Continuous",
		allowLoopback: true
	}) ;*/

	// and finally, make a couple of connections
	//jsPlumbInstance.connect ({ source: "opened", target: "phone1" }) ;
	//jsPlumbInstance.connect ({ source: "phone1", target: "phone1" }) ;
	//jsPlumbInstance.connect ({ source: "phone1", target: "inperson" }) ;

	//jsPlumb.fire ("jsPlumbDemoLoaded", jsPlumbInstance) ;
    
}) ;
