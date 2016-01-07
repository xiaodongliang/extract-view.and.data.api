//
// Copyright (c) Autodesk, Inc. All rights reserved
//
// Large Model Viewer Extractor
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
var express =require ('express') ;
var request =require ('request') ;
var fs =require ('fs') ;
var multipart =require ('connect-multiparty') ;
var bodyParser =require ('body-parser') ;
var flow =require ('./flow-node.js') ('tmp') ;

var ACCESS_CONTROLL_ALLOW_ORIGIN =false ;

var router =express.Router () ;

var multipartMiddleware =multipart () ;
router.post ('/file', multipartMiddleware, function (req, res) {
	flow.post (req, function (status, filename, original_filename, identifier, totalSize) {
		console.log ('POST', status, original_filename, identifier) ;
		if ( status == 'done' ) {
			var data ={
				'key': identifier,
				'name': original_filename,
				'size': totalSize,
				'bytesRead': totalSize,
				'bytesPosted': 0
			} ;
			fs.writeFile ('data/' + identifier + '.json', JSON.stringify (data), function (err) {
				if ( err )
					console.log (err) ;
			}) ;
			var st =fs.createWriteStream ('./tmp/' + original_filename)
				.on ('finish', function () {}) ;
			flow.write (identifier, st, {
				end: true,
				onDone: function () {
					flow.clean (identifier) ;
				}
			}) ;
		}
		//if ( ACCESS_CONTROLL_ALLOW_ORIGIN )
		//	res.header ("Access-Control-Allow-Origin", "*") ;
		//res.status (status).send () ;
		res.status (200).end () ;
	}) ;
}) ;

router.options ('/file', function (req, res) {
	console.log ('OPTIONS') ;
	//if ( ACCESS_CONTROLL_ALLOW_ORIGIN )
	//	res.header ("Access-Control-Allow-Origin", "*") ;
	res.status (200).send () ;
}) ;

// Handle status checks on chunks through Flow.js
router.get ('/file', function (req, res) {
	flow.get (req, function (status, filename, original_filename, identifier, totalSize) {
		console.log ('GET', status) ;
		//if ( ACCESS_CONTROLL_ALLOW_ORIGIN )
		//	res.header("Access-Control-Allow-Origin", "*") ;
		res.status (status == 'found' ? 200 : 404).send () ; //- 404 Not Found
	}) ;
}) ;

router.get ('/file/*/details', function (req, res) {
	//console.log ('GET', req) ;
	var identifier =req.url.split ('/') [2] ;
	fs.readFile ('data/' + identifier + '.json', function (err, data) {
		if ( err )
			return (res.status (404).send ()) ; //- 404 Not Found
		data =JSON.parse (data) ;
		//res.setHeader ('Content-Type', 'application/json') ;
		res.json (data) ;
	}) ;
}) ;

router.get ('/file/*', function (req, res) {
	//console.log ('GET', req) ;
	var identifier =req.url.split ('/') [2] ;
	var data =fs.readFile ('data/' + identifier + '.json', function (err, data) {
		if ( err )
			throw err ;
		data =JSON.parse (data) ;
		//console.log (JSON.stringify (data)) ;
		var serverFile =__dirname + '/../tmp/' + data.name ;
		fs.exists (serverFile, function (exists) {
			if ( exists )
				res.download (serverFile, data.name) ;
			else
				res.status (404).end () ; //- 404 Not Found
		}) ;
	}) ;
}) ;

// http://murmuring-woodland-5218.herokuapp.com/samples/Seat.dwf (fails)
// http://dwf.blogs.com/residential/VizProject3d.DWF (succeed, but no head content-length)
router.post ('/uri', bodyParser.json (), function (req, res) {
	var uri =req.body.uri ;
	var identifier =req.body.identifier ;
	var original_filename =req.body.name || decodeURIComponent (uri).replace (/[\?#].*$/, "").replace (/.*\//, "") ;
	request.head (uri, function (err, headRes, body) {
		if ( err )
			return (res.status (500).end ()) ;
		if ( headRes.statusCode != 200 )
			return (res.status (headRes.statusCode).end (headRes.statusMessage)) ;
		//console.log ('content-type:', headRes.headers ['content-type']) ;
		//console.log ('content-length:', headRes.headers ['content-length']) ;
		var data ={
			"key": identifier,
			"name": original_filename,
			"uri": uri,
			"size": headRes.headers ['content-length'] || -1,
			"bytesRead": 0,
			"bytesPosted": 0
		} ;
		fs.writeFile ('data/' + identifier + '.json', JSON.stringify (data), function (err) {
			if ( err )
				return (res.status (500).end ()) ;
			var r =request (uri)
				//.on ('error', function (err) {
				//	console.log (err) ;
				//	console.log ('r error ' + original_filename) ;
				//})
				.on ('data', function (chunk) {
					data.bytesRead +=chunk.length ;
					fs.writeFile ('data/' + identifier + '.json', JSON.stringify (data), function (err) {}) ;
				})
				.pipe (fs.createWriteStream ('./tmp/' + original_filename)) ;
			r.on ('close', function () {
				if ( data.size !== -1 )
					data.bytesRead =data.size ;
				else
					data.size =data.bytesRead ;
				fs.writeFile ('data/' + identifier + '.json', JSON.stringify (data), function (err) {}) ;
			}) ;
			r.on ('error', function (message) {
				fs.unlink ('data/' + identifier + '.json', function (err) {}) ;
			}) ;
			res.json ({ 'status': identifier }) ;
		}) ;
	}) ;
}) ;

router.options ('/uri', bodyParser.json (), function (req, res) {
	var identifier =req.body.identifier ;
	fs.readFile ('data/' + identifier + '.json', function (err, data) {
		if ( err )
			return (res.status (500).end ()) ;
		try {
			data =JSON.parse (data) ;
			if ( data.size == -1 )
				throw "error" ;
		} catch ( e ) {
			return (res.json ({ 'status': identifier, 'progress': -1 })) ;
		}
		res.json ({ 'status': identifier, 'progress': Math.floor (100 * data.bytesRead / data.size) }) ;
	}) ;
}) ;

module.exports =router ;
