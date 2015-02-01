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
$(document).ready (function () {

	$('#submit-project').submit (function (evt) {
		evt.preventDefault () ;
		
		var connections ={} ;
		var edges =jsPlumbInstance.getAllConnections () ;
		for ( var i =0 ; i < edges.length ; i++ ) {
            var c =edges [i] ;
			var key =c.source.id == 'lmv-root' ? c.source.id : c.source.id.substring (5) ;
            if ( !connections.hasOwnProperty (key) )
				connections [key] =[] ;
			connections [key].push (c.target.id.substring (5)) ;
        }
		
		var bucket =$('#bucket').val () ;

		var data ={ "bucket": bucket, "connections": connections } ;
		$.ajax ({
    		url: $('#submit-project').attr ('action'),
    		type: $('#submit-project').attr ('method'),
    		data: JSON.stringify (data),
    		contentType: 'application/json',
    		complete: null
		}).done (function (response) {
			alert (JSON.stringify (response)) ;
		}).fail (function (xhr, ajaxOptions, thrownError) {
			alert ('fail') ;
		}) ;
		
	});
	
}) ;