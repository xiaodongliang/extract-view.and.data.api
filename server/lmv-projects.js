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
var moment =require ('moment') ;
var lmv =require ('./lmv') ;

var router =express.Router () ;
router.use (bodyParser.json ()) ;

// List local buckets since we cannot list server buckets
router.get ('/projects', function (req, res) {
	try {
		fs.readdir ('data', function (err, files) {
			if ( err )
				throw err;
			var files =filterBucket (files, '(.*)\.bucket\.json') ;
			// Verify that the bucket is still valid before returning it
			async.mapLimit (files, 10,
				function (item, callback_map) { // Each tasks execution
					fs.readFile ('data/' + item + '.bucket.json', function (err, content) {
							if ( err )
								return (callback_map (err, null)) ;
							var js =JSON.parse (content) ;
							var dt =moment (js.createDate), now =moment () ;
							switch ( js.policyKey ) {
								case 'transient': // 24h
									dt.add (24, 'hours') ;
									if ( dt <= now )
										return (callback_map (null, null)) ;
									break ;
								case 'temporary': // 30 days
									dt.add (30, 'days') ;
									if ( dt <= now )
										return (callback_map (null, null)) ;
									break ;
								default:
									break ;
							}
							callback_map (null, item) ;
						}
					) ;
				},
				function (err, results) { //- All tasks are done
					if ( err !== undefined && err !== null )
						return (res.json ([])) ;
					var filtered =results.filter (function (obj) { return (obj != null) ; }) ;
					res.json (filtered) ;
				}
			) ;
		}) ;
	} catch ( err ) {
		res.status (404).send () ;
	}
}) ;

function filterBucket (arr, criteria) {
	var filtered =arr.filter (function (obj) { return (new RegExp (criteria).test (obj)) ; }) ;
	var results =[] ;
	for ( var index =0 ; index < filtered.length ; index++ )
		results.push (new RegExp (criteria).exec (filtered [index]) [1]) ;
	return (results) ;
}

// Get the progress on translating the bucket/identifier
router.get ('/projects/:bucket/:identifier/progress', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;
	var urn =new lmv.Lmv (bucket).getURN (identifier) ;
	if ( urn == '' )
		return (res.json ({ 'guid': '', 'progress': 'uploading to oss', 'startedAt': new Date ().toUTCString (), 'status': 'requested', 'success': '0%', 'urn': '' })) ;
	new lmv.Lmv (bucket).status (urn)
		.on ('success', function (data) {
			//console.log (data) ;
			if ( data.progress == 'complete' )
				fs.writeFile ('data/' + bucket + '.' + identifier + '.resultdb.json', JSON.stringify (data), function (err) {}) ;
			res.json (data) ;
		})
		.on ('fail', function (err) {
			//console.log (err) ;
			res.status (404).end () ;
		})
	;
}) ;

// Download a single file from its bucket/identifier pair
router.get ('/projects/:bucket/:identifier/get', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;
	new lmv.Lmv (bucket).download (identifier)
		.on ('success', function (data) {
			//console.log (data) ;
			res.setHeader ('Content-Type', data ['content-type']) ;
			res.setHeader ('Content-Transfer-Encoding', 'binary') ;
			res.attachment (data.filename) ;
			res.send (data.body).end () ;
		})
		.on ('fail', function (err) {
			//console.log (err) ;
			res.status (404).end () ;
		})
	;
}) ;

// Another way is to use *
//router.get ('/projects/*/*', function (req, res) {
//	var bucket =req.url.split ('/') [2] ;
//	var identifier =req.url.split ('/') [3] ;

// Get details on the bucket/identifier item
router.get ('/projects/:bucket/:identifier', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;
	// GET /oss/{apiversion}/buckets/{bucketkey}/objects/{objectKey}/details
	// would work as well, but since we saved it locally, use the local version
	try {
		fs.readFile ('data/' + bucket + '.' + identifier + '.json', function (err, data) {
			if ( err )
				throw err ;
			res.setHeader ('Content-Type', 'application/json') ;
			res.end (data) ;
		}) ;
	} catch ( err ) {
		return (res.status (404).end ()) ;
	}
}) ;

// Get details on the bucket
router.get ('/projects/:identifier', function (req, res) {
	var identifier =req.params.identifier ;
	// GET /oss/{api version}/buckets/{bucket key}/details
	// would work as well, but since we saved it locally, use the local version
	try {
		fs.readFile ('data/' + identifier + '.bucket.json', function (err, data) {
			if ( err )
				throw err ;
			res.setHeader ('Content-Type', 'application/json') ;
			res.end (data) ;
		}) ;
	} catch ( err ) {
		new lmv.Lmv (identifier).checkBucket ()
			.on ('success', function (data) {
				res.json (data) ;
			})
			.on ('fail', function (err) {
				res.status (404).end ('No such bucket') ;
			})
		;
	}
}) ;

// Submit a new bucket/identifier for translation
router.post ('/projects', function (req, res) {
	var bucket =req.body.bucket ;
	var policy =req.body.policy ;
	var connections =req.body.connections ;

	var items =Object.keys (connections) ;
	items =items.filter (function (item) { return (item != 'lmv-root') ; }) ;
	items =items.concat.apply (items, Object.keys (connections).map (function (key) { return (connections [key]) ; })) ;
	items =items.filter (function (value, index, self) { return (self.indexOf (value) === index) ; }) ;

	async.series ([
		function (callbacks1) {
			console.log ('createBucketIfNotExist') ;
			new lmv.Lmv (bucket).createBucketIfNotExist (policy)
				.on ('success', function (data) {
					console.log ('Bucket created (or did exist already)!') ;
					callbacks1 (null, 1) ;
				})
				.on ('fail', function (err) {
					console.log ('Failed to create bucket!') ;
					callbacks1 (null, 2) ;
				})
			;
		},

		function (callbacks2) {
			console.log ('async uploading(s)') ;
			async.each (items,
				function (item, callback) { // Each tasks execution
					console.log ('async uploading ' + item) ;
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
				function (err) { //- All tasks are done
					if ( err !== undefined && err !== null )
						return (console.log ('Something wrong happened during upload')) ;

					console.log ('All files uploaded') ;
					new lmv.Lmv (bucket).setDependencies (items.length == 1 ? null : connections)
						.on ('success', function (data) {
							console.log ('References set, launching translation') ;
							new lmv.Lmv (bucket).register (connections)
								.on ('success', function (data) {
									console.log ('URN registered for translation') ;
									// We are done for now!

									// Just remember locally we did submit the project for translation
									var identifier =connections ['lmv-root'] [0] ;
									var urn =new lmv.Lmv (bucket).getURN (identifier) ;
									urn =new Buffer (urn).toString ('base64') ;

									data ={
										'guid': urn,
										'progress': '0% complete',
										'startedAt': new Date ().toUTCString (),
										'status': 'requested',
										'success': '0%',
										'urn': urn
									} ;
									fs.writeFile ('data/' + bucket + '.' + identifier + '.resultdb.json', JSON.stringify (data), function (err) {}) ;
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
			callbacks2 (null, 3) ;
		}
	], function (err, results) {
		//- We are done!
	}) ;

	res
		//.status (202) //- 202 Accepted
		.json ({ 'status': 'submitted' }) ;
}) ;

module.exports =router ;
