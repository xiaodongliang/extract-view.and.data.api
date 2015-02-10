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
	$('#project-progress').hide () ;

	// List existing buckets
	/*var getProjectList =function() {
		var xhr =new XMLHttpRequest () ;
		xhr.open ('GET', 'http://' + window.location.host + '/api/projects', false) ;
		xhr.send (null) ;
		return (JSON.parse (xhr.responseText)) ;
	}

	var projects =getProjectList () ;
	for ( var i =0 ; i < projects.length ; i++ ) {
		$('#project-list').append ('<div><a href="#" onclick="$(\'#bucket\').val (this.text)">' + projects [i] + '</a></div>') ;
	}*/
	$.ajax ({
		url: 'http://' + window.location.host + '/api/projects',
		type: 'get',
		//data: null,
		contentType: 'application/json',
		complete: null
	}).done (function (projects) {
		for ( var i =0 ; i < projects.length ; i++ )
			$('#project-list').append ('<div><a href="#" onclick="$(\'#bucket\').val (this.text)">' + projects [i] + '</a></div>') ;
	}) ;

	// List existing project results
	$.ajax ({
		url: 'http://' + window.location.host + '/api/results',
		type: 'get',
		//data: null,
		contentType: 'application/json',
		complete: null
	}).done (function (results) {
		for ( var i =0 ; i < results.length ; i++ ) {
			var parts =results [i].name.split ('.') ;
			var file =parts [parts.length - 1] ;
			parts.splice (parts.length - 1, 1) ;
			var bucket =parts.join ('.') ;
			$('#project-results').append (
				  '<div class="view view-first flex-item">'
				+	'<center><img src="images/' + results [i].name + '.png" /></center>'
				+ 	'<div class="mask">'
				+		'<h2>' + bucket + '<br />' + file + '</h2>'
				+		'<p>' + results [i].status + '</p>'
				+		'<a href="' + results [i].name + '" class="info" target="' + results [i].name + '">Explore</a>'
				+	'</div>'
				+ '</div>'
			) ;
		}
	}) ;

	// Add event on the form submit
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
		var policy =$('#policy').val () ;

		var data ={ 'bucket': bucket, 'policy': policy, 'connections': connections } ;
		$.ajax ({
			url: $('#submit-project').attr ('action'),
			type: $('#submit-project').attr ('method'),
			data: JSON.stringify (data),
			contentType: 'application/json',
			complete: null
		}).done (function (response) {
			//- At this stage we asked the server to:
			//-   1. upload the files on the Autodesk server
			//-   2. set teh dependencies between files
			//-   3. register the translation of the files
			//- We know can wait for the service to complete
			$('#project-progress-bar').val (0) ;
			$('#project-progress-indicator').val ('0%') ;
			$('#project-progress').show () ;
			setTimeout (function () { projectProgress (bucket, connections ['lmv-root'] [0]) ; }, 5000) ;
		}).fail (function (xhr, ajaxOptions, thrownError) {
			alert ('Failed to create your project!') ;
			$('#project-progress').hide () ;
		}) ;

	});

}) ;

function projectProgress (bucket, root) {
	$.ajax ({
		url: '/api/projects/' + bucket + '/' + root + '/progress',
		type: 'get',
		//data: JSON.stringify ({ 'bucket': bucket, 'root': root }),
		contentType: 'application/json',
		complete: null
	}).done (function (response) {
		//$('#project-progress').val (value) ;
		if ( response.progress == 'complete' ) {
			$('#project-progress-bar').val (100) ;
			$('#project-progress-indicator').val ('100%') ;
			$('#project-progress').hide () ;
		} else {
			$('#project-progress-bar').val (parseInt (response.success)) ;
			$('#project-progress-indicator').val (response.success) ;
			setTimeout (function () { projectProgress (bucket, root) ; }, 500) ;
		}
	}).fail (function (xhr, ajaxOptions, thrownError) {
		//$('#project-progress')
		console.log ('Progress request failed!') ;
		$('#project-progress').hide () ;
	}) ;
}