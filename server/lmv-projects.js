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

function filterBucket (arr, criteria) {
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

router.get ('/projects', function (req, res) {
	try {
		fs.readdir ('data', function (err, files) {
			if ( err )
				throw err;
			files =filterBucket (files, '(.*)\.bucket\.json') ;
			// TODO: verify that the bucket is still valid before returning it
			//res.send (JSON.stringify (files)) ;
			res.json (files) ;
		}) ;
	} catch ( err ) {
		res.status (404).send () ;
	}
}) ;

router.get ('/projects/*/progress', function (req, res) {
	var bucket =req.url.split ('/') [2] ;
	var identifier =req.url.split ('/') [3] ;

	var urn =new lmv.Lmv (bucket).getURN (identifier) ;
	new lmv.Lmv (bucket).status (urn)
		.on ('success', function (data) {
			//console.log (data) ;
			res.json (data) ;
		})
		.on ('fail', function (err) {
			//console.log (err) ;
			res.status (404).end () ;
		})
	;
}) ;

router.get ('/projects/*/*', function (req, res) {
	var bucket =req.url.split ('/') [2] ;
	var identifier =req.url.split ('/') [3] ;
	// GET /oss/{apiversion}/buckets/{bucketkey}/objects/{objectKey}/details
	// would work as well, but since we saved it locally, use the local version
	var data =fs.readFileSync ('data/' + bucket + '.' + identifier + '.json') ;
	data =JSON.parse (data) ;
	res.json (data) ;
}) ;

router.get ('/projects/*', function (req, res) {
	//console.log ('GET', req) ;
	var identifier =req.url.split ('/') [2] ;
	// GET /oss/{api version}/buckets/{bucket key}/details
	// would work as well, but since we saved it locally, use the local version
	var data =fs.readFileSync ('data/' + identifier + '.bucket.json') ;
	res.setHeader ('Content-Type', 'application/json') ;
	res.end (data) ;
}) ;

router.post ('/projects', function (req, res) {
	var bucket =req.body.bucket ;
	var policy =req.body.policy ;
	var connections =req.body.connections ;

	var items =Object.keys (connections) ;
	items =items.filter (function (item) { return (item != 'lmv-root') ; }) ;
	items =items.concat.apply (items, Object.keys (connections).map (function (key) { return (connections [key]) ; })) ;
	items =items.filter (function (value, index, self) { return (self.indexOf (value) === index) ; }) ;

	async.each (items,
		function (item, callback) { //- Each tasks execution
			new lmv.Lmv (bucket).uploadFile (item)
				.on ('success', function (data) {
					console.log (item + ' upload completed!') ;
					callback () ;
				})
				.on ('fail', function (err) {
					console.log ('Failed to upload ' + item) ;
					callback () ;
				})
			;
		},
		function (err) { //- All tasks are cone
			if ( err !== undefined )
				return (console.log ('Something wrong happened during upload')) ;

			console.log ('All files uploaded') ;
			new lmv.Lmv (bucket).setDependencies (items.length == 1 ? null : connections)
				.on ('success', function (data) {
					console.log ('References set, launching translation') ;
					new lmv.Lmv (bucket).register (connections)
						.on ('success', function (data) {
							console.log ('URN registered for translation') ;
							//- We are done for now!
						})
						.on ('fail', function (err) {
							console.log ('URN registration for translation failed: ' + err) ;
						})
					;
				})
				.on ('fail', function (err) {
					console.log (err) ;
				})
			;
		}
	) ;

	res
		//.statux (202) //- 202 Accepted
		.json ({ "status": "submitted" }) ;
}) ;

module.exports =router ;
