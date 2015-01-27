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

router.post ('/upload', multipartMiddleware, function (req, res) {
	flow.post (req, function (status, filename, original_filename, identifier) {
		console.log ('POST', status, original_filename, identifier) ;
		if ( status == 'done' ) {
			var data ;
			try {
				data =JSON.parse (fs.readFileSync ('files.txt')) ;
			} catch ( err ) {
				data ={} ;
			}
			data [identifier] ={
				"name": original_filename,
				"urn": ""
			} ;
			fs.writeFile ('files.txt', JSON.stringify (data), function (err) {
				if (err)
					return (console.log (err)) ;
			}) ;
			//fs.renameSync () ;
		}
		//if ( ACCESS_CONTROLL_ALLOW_ORIGIN )
		//	res.header ("Access-Control-Allow-Origin", "*") ;
		res.status (status).send () ;
	}) ;
}) ;

router.options ('/upload', function(req, res) {
	console.log ('OPTIONS') ;
	//if ( ACCESS_CONTROLL_ALLOW_ORIGIN )
	//	res.header ("Access-Control-Allow-Origin", "*") ;
	res.status (200).send () ;
}) ;

// Handle status checks on chunks through Flow.js
router.get ('/upload', function (req, res) {
	flow.get (req, function (status, filename, original_filename, identifier) {
		console.log ('GET', status) ;
		//if ( ACCESS_CONTROLL_ALLOW_ORIGIN )
		//	res.header("Access-Control-Allow-Origin", "*") ;
		if ( status == 'found' )
			status =200 ;
		else
			status =404 ;
		res.status (status).send () ;
	}) ;
}) ;

router.get ('/download/*', function (req, res) {
	//console.log ('GET', req) ;
	var data =fs.readFileSync ('files.txt') ;
	data =JSON.parse (data) ;
	//console.log (JSON.stringify (data)) ;
	var key =req.url.split ('/') [2] ;
	var serverFile =__dirname + '/../tmp/flow-' + key + '.1' ;
	fs.exists (serverFile, function (exists) {
		if ( exists )
			res.download (serverFile, data [key].name) ;
		else
			res.status (404).end () ;
	}) ;
}) ;

module.exports =router ;
