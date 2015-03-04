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

var Project =function (bucket, identifier) {
	this.bucket =bucket ;
	this.identifier =identifier ;
} ;

//Project.prototype.speak =function() {} ;

// List existing buckets
Project.listBuckets =function () {
	/*
	var getProjectList =function() {
	var xhr =new XMLHttpRequest () ;
	xhr.open ('GET', 'http://' + window.location.host + '/api/projects', false) ;
		xhr.send (null) ;
		return (JSON.parse (xhr.responseText)) ;
	}

	var projects =getProjectList () ;
	for ( var i =0 ; i < projects.length ; i++ ) {
		$('#project-list').append ('<div><a href="#" onclick="$(\'#bucket\').val (this.text)">' + projects [i] + '</a></div>') ;
	}
	*/
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
} ;

// List existing project results
Project.listProjects =function () {
	$.ajax ({
		url: 'http://' + window.location.host + '/api/results',
		type: 'get',
		//data: null,
		contentType: 'application/json',
		complete: null
	}).done (function (results) {
		for ( var i =0 ; i < results.length ; i++ ) {
			var parts =results [i].name.split ('.') ;
			var identifier =parts [parts.length - 1] ;
			parts.splice (parts.length - 1, 1) ;
			var bucket =parts.join ('.') ;
			Project.createProjectVignette (bucket, identifier, results [i]) ;
		}
	}) ;
} ;

Project.createProjectVignette =function (bucket, identifier, data) {
	data.hasThumbnail =data.hasThumbnail || 'false' ;
	data.progress =data.progress || 'complete' ;
	if ( data.hasThumbnail == 'false' )
        data.progress ='project' ;
	data.success =data.success || '100%' ;
	var name =bucket + '.' + identifier ;
	var progressui =(data.progress != 'complete' && data.progress != 'failed' ? '<progress class="project-progress-bar" value="' + parseInt (data.success) + '" max="100"></progress>' : '') ;
	var imageui =(data.progress == 'complete' ? name : (data.progress == 'failed' ? 'failed' : 'processing')) ;
	var url =(data.progress != 'failed' ? '/explore/' + name : '#') ;
	$('#project-results').append (
		'<div class="view view-first flex-item" id="' + name + '">'
		//+	'<a href="#' + name + '" />'
		+	'<img src="/images/' + imageui + '.png" />'
		+ 	'<div class="mask">'
		+		'<h2>' + bucket + '<br />' + identifier + '</h2>'
		+		'<p>' + data.progress + ' (' + data.success + ')</p>'
		+		'<a href="' + url + '" class="info" target="' + name + '">Explore</a>'
		+	'</div>'
		+	progressui
		+ '</div>'
	) ;
	if ( data.progress != 'complete' && data.progress != 'failed' )
		setTimeout (function () { Project.projectProgress (bucket, identifier) ; }, 5000) ;
} ;

Project.projectProgress =function (bucket, root) {
	$.ajax ({
		url: '/api/projects/' + bucket + '/' + root + '/progress',
		type: 'get',
		//data: JSON.stringify ({ 'bucket': bucket, 'root': root }),
		contentType: 'application/json',
		complete: null
	}).done (function (response) {
		var name ='#' + bucket + '\\.' + root ;
		if ( response.progress == 'complete' ) {
			$(name + ' div p').text ('success (100%)') ;
			$(name + ' div a.info').unbind ('click').text ('Explore').attr ('href', '/explore/' + bucket + '.' + root) ;
			$(name + ' progress').remove () ;

			if ( response.hasThumbnail == 'true' ) {
				$.ajax ({
					url: '/api/results/' + bucket + '/' + root + '/thumbnail',
					type: 'get',
					complete: null
				}).done (function (response) {
					$(name + ' img').attr ('src', '/images/' + bucket + '.' + root + '.png') ;
				}) ;
			} else {
                $(name + ' img').attr ('src', '/images/project.png') ;
			}
		} else {
			$(name + ' progress').val (parseInt (response.progress)) ;
			$(name + ' div p').text ('progress') ;

			setTimeout (function () { Project.projectProgress (bucket, root) ; }, 500) ;
		}
	}).fail (function (xhr, ajaxOptions, thrownError) {
		var name ='#' + bucket + '\\.' + root ;
		console.log ('Progress request failed!') ;
		$(name + ' progress').remove () ;
		$(name + ' div p').text ('Failed!') ;
		$(name + ' img').attr ('src', '/images/failed.png') ;
	}) ;
} ;

Project.scrollTo =function (bucket, identifier) {
	var name ='#' + bucket + '\\.' + identifier ;
	// Calculate destination place
	var dest =$(name).offset ().top ;
	if ( $(name).offset ().top > $(document).height () - $(window).height () )
		dest =$(document).height () - $(window).height () ;
	// Go to destination
	$('html, body').animate ({ scrollTop: dest }, 1000, 'swing') ;
} ;

// Initialization
$(document).ready (function () {
	// List existing buckets
	Project.listBuckets () ;
	// List existing project results
	Project.listProjects () ;

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
		var root =connections ['lmv-root'] [0] ;

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
			//-   2. set the dependencies between files
			//-   3. register the translation of the files
			//- We know can wait for the service to complete
			Project.createProjectVignette (bucket, root, { 'progress': 'requested', 'success': '0%', 'hasThumbnail': 'true' }) ;
			setTimeout (function () { Project.scrollTo (bucket, root) ; }, 100) ;
			setTimeout (function () { Project.projectProgress (bucket, root) ; }, 5000) ;
		}).fail (function (xhr, ajaxOptions, thrownError) {
			alert ('Failed to create your project!') ;
		}) ;
	});

}) ;
