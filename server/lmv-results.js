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
var request =require ('request') ;
var bodyParser =require ('body-parser') ;
var fs =require ('fs') ;
var async =require ('async') ;
var lmv =require ('./lmv') ;

function filterProject (arr, criteria) {
	var filtered =arr.filter (function (obj) {
		return (new RegExp (criteria).test (obj)) ;
	}) ;
	var results =[] ;
	for ( var index =0 ; index < filtered.length ; index++ )
		results.push (new RegExp (criteria).exec (filtered [index]) [1]) ;
	return (results) ;
}

var router =express.Router () ;
router.use (bodyParser.json ()) ;

// List translated projects
router.get ('/results', function (req, res) {
	try {
		fs.readdir ('data', function (err, files) {
			if ( err )
				throw err ;
			var out =[] ;
			files =filterProject (files, '(.*)\.resultdb\.json') ;
			// TODO: verify that the bucket is still valid before returning it
			for ( var i =0 ; i < files.length ; i++ ) {
				try {
					var data =fs.readFileSync ('data/' + files [i] + '.resultdb.json') ;
					data =JSON.parse (data) ;
					out.push ({
						name: files [i],
						urn: data.urn,
						date: data.startedAt,
						status: data.status + ' (' + data.success + ')'
					}) ;
				} catch ( err ) {
				}
			}
			//res.send (JSON.stringify (files)) ;
			//res.json (files) ;
			res.json (out) ;
		}) ;
	} catch ( err ) {
		res.status (404).send () ;
	}
}) ;

// Download thumbnail from a bucket/identifier pair
router.get ('/projects/:bucket/:identifier/thumbnail', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;
	var urn =new lmv.Lmv (bucket).getURN (identifier) ;
	if ( urn == '' )
		return (res.json ({ progress: 0 })) ;
	new lmv.Lmv (bucket).thumbnail (urn, 215, 146)
		.on ('success', function (data) {
			try {
				fs.writeFile ('data/' + bucket + '.' + identifier + '.png', data, function (err) {}) ;
				fs.writeFile ('www/images/' + bucket + '.' + identifier + '.png', data, function (err) {
					if ( err )
						console.log (err) ;
				}) ;
			} catch ( err ) {
			}
			res.setHeader ('Content-Type', 'image/png') ;
			res.end (data, 'binary') ;
		})
		.on ('fail', function (err) {
			//console.log (err) ;
			res.status (404).end () ;
		})
	;
}) ;

// Download a single file from its bucket/identifier pair
router.get ('/results/:bucket/:identifier', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;

	var data =fs.readFileSync ('data/' + bucket + '.' + identifier + '.resultdb.json') ;
	data =JSON.parse (data) ;

	//var urn ="urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Y3lyaWxsZS0yMDE1MDIwNC9BdS5vYmo=/output/Au.obj.svf" ;
	//var urn ="urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Y3lyaWxsZS0yMDE1MDIwNC9BdS5vYmo=/output/properties.db" ;
	var urn ="dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Y3lyaWxsZS0yMDE1MDIwNC9BdS5vYmo=" ;

	new lmv.Lmv (bucket).downloadurn (urn)
		.on ('success', function (data) {
			//console.log (data) ;
			res.setHeader ('Content-Type', 'application/octet-stream') ;
			res.setHeader ('Content-Transfer-Encoding', 'binary') ;
			//res.attachment ('Au.obj.svf') ;
			res.attachment ('xxx.db') ;
			res.send (data).end () ;
		})
		.on ('fail', function (err) {
			//console.log (err) ;
			res.status (404).end () ;
		})
	;
}) ;

module.exports =router ;