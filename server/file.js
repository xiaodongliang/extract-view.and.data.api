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
var express =require ('express') ;
var fs =require ('fs') ;
var multipart =require ('connect-multiparty') ;
var flow =require ('./flow-node.js') ('tmp') ;

var ACCESS_CONTROLL_ALLOW_ORIGIN =false ;

var router =express.Router () ;
var multipartMiddleware =multipart () ;

router.post ('/file', multipartMiddleware, function (req, res) {
	flow.post (req, function (status, filename, original_filename, identifier) {
		console.log ('POST', status, original_filename, identifier) ;
		if ( status == 'done' ) {
			var data ={
				'key': identifier,
				'name': original_filename
			} ;
			fs.writeFile ('data/' + identifier + '.json', JSON.stringify (data), function (err) {
				if ( err )
					console.log (err) ;
			}) ;
			var st =fs.createWriteStream ('./tmp/' + original_filename) ;
			st.on ('finish', function () {}) ;
			flow.write (identifier, st, {
				end: true,
				onDone: function () {
					flow.clean (identifier) ;
				}
			}) ;
		}
		//if ( ACCESS_CONTROLL_ALLOW_ORIGIN )
		//	res.header ("Access-Control-Allow-Origin", "*") ;
		res.status (status).send () ;
	}) ;
}) ;

router.options ('/file', function(req, res) {
	console.log ('OPTIONS') ;
	//if ( ACCESS_CONTROLL_ALLOW_ORIGIN )
	//	res.header ("Access-Control-Allow-Origin", "*") ;
	res.status (200).send () ;
}) ;

// Handle status checks on chunks through Flow.js
router.get ('/file', function (req, res) {
	flow.get (req, function (status, filename, original_filename, identifier) {
		console.log ('GET', status) ;
		//if ( ACCESS_CONTROLL_ALLOW_ORIGIN )
		//	res.header("Access-Control-Allow-Origin", "*") ;
		res.status (status == 'found' ? 200 : 404).send () ; //- 404 Not Found
	}) ;
}) ;

router.get ('/file/*/details', function (req, res) {
	//console.log ('GET', req) ;
	var identifier =req.url.split ('/') [2] ;
	var data =fs.readFileSync ('data/' + identifier + '.json') ;
	data =JSON.parse (data) ;
	res.setHeader ('Content-Type', 'application/json') ;
	res.json (data) ;
}) ;

router.get ('/file/*', function (req, res) {
	//console.log ('GET', req) ;
	var identifier =req.url.split ('/') [2] ;
	var data =fs.readFileSync ('data/' + identifier + '.json') ;
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

module.exports =router ;
