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
	var r =new Flow ({ target: '/api/file', chunkSize: 1024 * 1024, testChunks: false }) ;
	// Flow.js isn't supported, fall back on a different method
	if ( !r.support ) {
		$('.flow-error').show () ;
		return ;
	}
	// Show a place for dropping/selecting files
	$('.flow-drop').show () ;
	r.assignDrop ($('.flow-drop') [0]) ;
	r.assignBrowse ($('.flow-browse') [0]) ;
	r.assignBrowse ($('.flow-browse-folder') [0], true) ;
	r.assignBrowse ($('.flow-browse-image') [0], false, false, { accept: 'image/*' }) ;
	// Handle file add event
	r.on ('fileAdded', function (file) {
		// Show progress bar
		$('.flow-progress, .flow-list').show () ;
		// Add the file to the list
		$('.flow-list').append (
			   '<li class="flow-file flow-file-' + file.uniqueIdentifier + '">'
			+ 'Uploading <span class="flow-file-name"></span> '
			+ '<span class="flow-file-size"></span> '
			+ '<span class="flow-file-progress"></span> '
			+ '<a href="" class="flow-file-download" target="_blank">'
			+ 'Download'
			+ '</a> '
			+ '<span class="flow-file-pause">'
			+ ' <img src="img/pause.png" title="Pause upload" />'
			+ '</span>'
			+ '<span class="flow-file-resume">'
			+ ' <img src="img/resume.png" title="Resume upload" />'
			+ '</span>'
			+ '<span class="flow-file-cancel">'
			+ ' <img src="img/cancel.png" title="Cancel upload" />'
			+ '</span>'
		) ;
		var $self =$('.flow-file-' + file.uniqueIdentifier) ;
		$self.find ('.flow-file-name').text (file.name) ;
		$self.find ('.flow-file-size').text (readablizeBytes (file.size)) ;
		$self.find ('.flow-file-download').attr ('href', '/api/file/' + file.uniqueIdentifier).hide () ;
		$self.find ('.flow-file-pause').on ('click', function () {
			file.pause () ;
			$self.find ('.flow-file-pause').hide () ;
			$self.find ('.flow-file-resume').show () ;
		}) ;
		$self.find ('.flow-file-resume').on ('click', function () {
			file.resume () ;
			$self.find ('.flow-file-pause').show () ;
			$self.find ('.flow-file-resume').hide () ;
		}) ;
		$self.find ('.flow-file-cancel').on ('click', function () {
			file.cancel () ;
			$self.remove () ;
		}) ;
        
        $('#dependencies-editor-area').append ('<div class="w" id="root-' + file.uniqueIdentifier + '">' + file.name + '<div class="ep"></div></div>') ;
        jsPlumbInstance.draggable ('root-' + file.uniqueIdentifier, { containment: 'dependencies-editor-area' }) ;
        jsPlumbInstance.makeSource ('root-' + file.uniqueIdentifier, {
            filter: ".ep",
            anchor: "Continuous",
            connector: [ "StateMachine", { curviness: 20 } ],
            connectorStyle: { strokeStyle: "#5c96bc", lineWidth: 2, outlineColor: "transparent", outlineWidth: 4 }
            //maxConnections: 5,
            //onMaxConnections: function (info, e) {
            //	alert ("Maximum connections (" + info.maxConnections + ") reached") ;
            //}
        }) ;
        jsPlumbInstance.makeTarget ('root-' + file.uniqueIdentifier, {
            dropOptions: { hoverClass: "dragHover" },
            anchor: "Continuous",
            allowLoopback: true
        }) ;
        
        var elts =jsPlumbInstance.getSelector (".statemachine .w") ;
        if ( elts.length == 2 ) {
            jsPlumbInstance.addClass (elts [1], 'rootc') ;
            jsPlumbInstance.connect ({ source: "lmv-root", target: "root-" + file.uniqueIdentifier }) ;
        }
        autoArrange () ;
                
	}) ;
	r.on ('filesSubmitted', function (file) {
		r.upload () ;
	}) ;
	r.on ('complete', function () {
		// Hide pause/resume when the upload has completed
		$('.flow-progress .progress-resume-link, .flow-progress .progress-pause-link').hide () ;
	}) ;
	r.on ('fileSuccess', function (file,message) {
		var $self = $('.flow-file-'+file.uniqueIdentifier);
		// Reflect that the file upload has completed
		$self.find ('.flow-file-progress').text ('(completed)') ;
		$self.find ('.flow-file-pause, .flow-file-resume').remove () ;
		$self.find ('.flow-file-download').attr ('href', '/api/file/' + file.uniqueIdentifier).show () ;
	}) ;
	r.on ('fileError', function(file, message){
		// Reflect that the file upload has resulted in error
		$('.flow-file-'+file.uniqueIdentifier + ' .flow-file-progress').html ('(file could not be uploaded: '+message+')') ;
	}) ;
	r.on ('fileProgress', function (file){
		// Handle progress for both the file and the overall upload
		$('.flow-file-'+file.uniqueIdentifier+' .flow-file-progress')
			.html (
				Math.floor (file.progress () * 100) + '% '
			+ readablizeBytes(file.averageSpeed) + '/s '
			+ secondsToStr(file.timeRemaining()) + ' remaining'
		) ;
		$('.progress-bar').css ({width:Math.floor(r.progress()*100) + '%'}) ;
	}) ;
	r.on ('uploadStart', function () {
		// Show pause, hide resume
		$('.flow-progress .progress-resume-link').hide () ;
		$('.flow-progress .progress-pause-link').show () ;
	}) ;
	r.on ('catchAll', function () {
		console.log.apply (console, arguments) ;
	}) ;
	window.r ={
		pause: function () {
			r.pause () ;
			// Show resume, hide pause
			$('.flow-file-resume').show () ;
			$('.flow-file-pause').hide () ;
			$('.flow-progress .progress-resume-link').show () ;
			$('.flow-progress .progress-pause-link').hide () ;
		},
		cancel: function () {
			r.cancel () ;
			$('.flow-file').remove () ;
		},
		upload: function () {
			$('.flow-file-pause').show () ;
			$('.flow-file-resume').hide () ;
			r.resume () ;
		},
		flow: r
	} ;
}) ;

function readablizeBytes (bytes) {
	var s =['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'] ;
	var e =Math.floor (Math.log (bytes) / Math.log (1024)) ;
	return ((bytes / Math.pow (1024, e)).toFixed (2) + " " + s [e]) ;
}

function secondsToStr (temp) {
	function numberEnding (number) {
		return ((number > 1) ? 's' : '') ;
	}
	var years =Math.floor (temp / 31536000) ;
	if ( years )
		return (years + ' year' + numberEnding (years)) ;
	var days =Math.floor((temp %= 31536000) / 86400) ;
	if ( days )
		return (days + ' day' + numberEnding (days)) ;
	var hours =Math.floor ((temp %= 86400) / 3600) ;
	if ( hours )
		return (hours + ' hour' + numberEnding (hours)) ;
	var minutes =Math.floor ((temp %= 3600) / 60) ;
	if ( minutes )
		return (minutes + ' minute' + numberEnding (minutes)) ;
	var seconds =temp % 60 ;
	return (seconds + ' second' + numberEnding (seconds)) ;
}