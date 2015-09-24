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
var path =require ('path') ;
var mkdirp =require ('mkdirp') ;
var rimraf =require ('rimraf') ;
var async =require ('async') ;
var lmv =require ('./lmv') ;
var AdmZip =require ('adm-zip') ;
var archiver =require ('archiver') ;
var ejs =require ('ejs') ;
var zlib =require ('zlib') ;
var moment =require ('moment') ;
//var nodemailer =require ('nodemailer') ;
//var directTransport =require ('nodemailer-direct-transport') ;

var router =express.Router () ;
router.use (bodyParser.json ()) ;

// List translated projects
router.get ('/results', function (req, res) {
	try {
		fs.readdir ('data', function (err, files) {
			if ( err )
				throw err ;
			files =filterProject (files, '(.*)\\.resultdb\\.json') ;
			async.mapLimit (files, 10,
				function (file, callback_map) { // Each tasks execution
					fs.readFile ('data/' + file + '.resultdb.json', 'utf-8', function (err, data) {
						//console.log ('data/' + file + '.resultdb.json') ;
						if ( err || data == '' )
							return (callback_map (null, null)) ;
						//console.log (data) ;
						data =JSON.parse (data) ;
						var out ={
							name: file,
							urn: data.urn,
							date: data.startedAt,
							hasThumbnail: data.hasThumbnail,
							status: data.status,
							success: data.success,
							progress: data.progress
						} ;
						callback_map (null, out)
					}) ;
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

function filterProject (arr, criteria) {
	var filtered =arr.filter (function (obj) { return (new RegExp (criteria).test (obj)) ; }) ;
	var results =[] ;
	for ( var index =0 ; index < filtered.length ; index++ )
		results.push (new RegExp (criteria).exec (filtered [index]) [1]) ;
	return (results) ;
}

// Download thumbnail from a bucket/identifier pair
router.get ('/results/:bucket/:identifier/thumbnail', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;
	var urn =new lmv.Lmv (bucket).getURN (identifier) ;
	if ( urn == '' )
		return (res.json ({ progress: 0 })) ;
	new lmv.Lmv (bucket).thumbnail (urn, 215, 146)
		.on ('success', function (data) {
			try {
				fs.writeFile ('data/' + bucket + '.' + identifier + '.png', data, function (err) {}) ;
				fs.writeFile ('www/images/' + bucket + '.' + identifier + '.png', data, function (err) {}) ;
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

// Get the bucket/identifier viewable data
router.get ('/results/:bucket/:identifier', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;
	var urn =new lmv.Lmv (bucket).getURN (identifier) ;
	if ( urn == '' )
		return (res.status (404).end ()) ;
	new lmv.Lmv (bucket).all (urn)
		.on ('success', function (data) {
			if ( data.progress == 'complete' )
				fs.writeFile ('data/' + bucket + '.' + identifier + '.resultdb.json', JSON.stringify (data), function (err) {}) ;
			res.json (data) ;
		})
		.on ('fail', function (err) {
			res.status (404).end () ;
		})
	;
}) ;

// Delete the project from the website
router.delete ('/results/:bucket/:identifier', function (req, res) {
    var bucket =req.params.bucket ;
    var identifier =req.params.identifier ;
    var urn =new lmv.Lmv (bucket).getURN (identifier) ;
    if ( urn == '' )
        return (res.status (404).end ()) ;
    fs.exists ('data/' + bucket + '.' + identifier + '.resultdb.json', function (exist) {
        if ( !exist )
            return (res.status (404).end ()) ;
        fs.rename (
            'data/' + bucket + '.' + identifier + '.resultdb.json',
            'data/' + bucket + '.' + identifier + '.resultdb.json.deleted',
            function (err, exist) {
                res.end () ;
            }
        )
    }) ;
}) ;

// Get the bucket/identifier viewable data as a zip file containing all resources
router.get ('/results/:bucket/:identifier/project', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;
	var urn =new lmv.Lmv (bucket).getURN (identifier) ;
	if ( urn == '' )
		return (res.status (404).end ()) ;

	try {
		rimraf ('data/' + identifier, function (err) {
			if ( err )
				throw err ;
			async.waterfall ([
					function (callback_wf1a) { wf1_GetFullDetails (callback_wf1a, bucket, identifier, urn) ; }, // Get latest full details
					function (data, callback_wf1b) { wf1_GetItems (data, callback_wf1b, bucket, identifier) ; }, // From full details, get all individual elements to download
					function (results, callbacks_wf1c) { wf1_ReadSvfF2dManifest (results, callbacks_wf1c, bucket, identifier) ; }, // .svf/.f2d/manifest additional references to download/create
					function (uris, callback_wf1d) { wf1_GetAdditionalItems (uris, callback_wf1d, bucket, identifier) ; }, // Get additional items from the previous extraction step
					function (refs, callback_wf1e) { wf1_GenerateLocalHtml (refs, callback_wf1e, bucket, identifier) ; } // Generate helper html/bat
				],
				function (err, results) { wf1End_PackItems (err, results, identifier) ; } // Create a ZIP file and return all elements
			) ;
		}) ;
	} catch ( err ) {
		console.log ('router.get (/results/:bucket/:identifier/project) exception ' + err) ;
	}
	res.end () ;
}) ;

// Get latest full details
function wf1_GetFullDetails (callback_wf1a, bucket, identifier, urn) {
	console.log ('#1 - Getting full viewable information') ;
	new lmv.Lmv (bucket).all (urn)
		.on ('success', function (data) {
			if ( data.progress == 'complete' )
				fs.writeFile ('data/' + bucket + '.' + identifier + '.resultdb.json', JSON.stringify (data), function (err) {}) ;
			callback_wf1a (null, data) ;
		})
		.on ('fail', function (err) {
			callback_wf1a (err, null) ;
		})
	;
}

// From full details, get all individual elements to download
function wf1_GetItems (data, callback_wf1b, bucket, identifier) {
	console.log ('#2a - Filtering objects') ;
	// Collect Urns to extract from the server
	var items =loop4Urns (data) ;
	items =items.filter (function (item) { return (item !== undefined) ; }) ;
	items.shift () ;

	// Collect Views to create from the viewables
	var views =loop4Views (data, data, identifier) ;
	items =items.concat (views) ;

	// Add manifest & metadata files for f2d file
	console.log ('#2b - Adding manisfest & metadata files for any .f2d files') ;
	for ( var i =0 ; i < items.length ; i++ ) {
		if ( path.extname (items [i]) == '.f2d' ) {
			items.push (path.dirname (items [i]) + '/manifest.json.gz') ;
			items.push (path.dirname (items [i]) + '/metadata.json.gz') ;
		}
	}

	console.log ('#2c - Download each item asynchronously') ;
	async.mapLimit (items, 10, // Let's have 10 workers only to limit lose of references (too many for the Autodesk server ;)
		function (item, callback_map1) { // Each tasks execution
			if ( typeof item != 'string' ) {
				callback_map1 (null, item) ;
				return ;
			}
			DownloadAndSaveItemToDisk (callback_map1, bucket, identifier, item) ;
		},
		function (err, results) { //- All tasks are done
			if ( err !== undefined && err !== null ) {
				console.log ('Something wrong happened during download') ;
				callback_wf1b (err, null) ;
				return ;
			}
			callback_wf1b (null, results) ;
		}
	) ;
}

function loop4Urns (doc) {
	var data =[] ;
	if ( doc.urn !== undefined )
		data.push (doc.urn) ;
	if ( doc.children !== undefined ) {
		for ( var i in doc.children )
			data =data.concat (loop4Urns (doc.children [i])) ;
	}
	return (data) ;
}

function loop4Views (doc, parentNode, identifier) {
	var data =[] ;
	if (   doc.urn !== undefined
		&& (path.extname (doc.urn) == '.svf' || path.extname (doc.urn) == '.f2d')
	) {
		var fullpath =doc.urn.substring (doc.urn.indexOf ('/output/') + 8) ;
		data.push ({ 'path': fullpath, 'name': parentNode.name }) ;
	}
	if ( doc.children !== undefined ) {
		for ( var i in doc.children )
			data =data.concat (loop4Views (doc.children [i], doc, identifier)) ;
	}
	return (data) ;
}

function DownloadAndSaveItemToDisk (callback_mapx, bucket, identifier, item) {
	try {
		new lmv.Lmv (bucket).downloadItem (item)
			.on ('success', function (data) {
				//var filename =item.split ('/').pop () ;
				var filename =path.basename (item) ;
				var fullpath ='data/' + identifier + '/' + item.substring (item.indexOf ('/output/') + 8) ;
				var filepath =path.dirname (fullpath) ;
				try {
					mkdirp (filepath, function (err) {
						if ( err )
							throw err ;
						fs.writeFile (fullpath, data, function (err) {
							callback_mapx (null, { urn: item, name: fullpath.substring (5) }) ;
						}) ;
					}) ;
				} catch ( err ) {
					console.log ('DownloadAndSaveItemToDisk exception ' + err) ;
					console.log ('Save to disk failed for ' + item) ;
					callback_mapx (err, null) ;
				}
			})
			.on ('fail', function (err) {
				if ( err == 404 ) {
					console.log ('Error 404 - ' + item + ' <ignoring>') ;
					var fullpath ='data/' + identifier + '/' + item.substring (item.indexOf ('/output/') + 8) ;
					callback_mapx (null, { urn: item, name: fullpath.substring (5), error: 404 }) ;
					return ;
				}
				console.log ('Download failed for ' + item) ;
				callback_mapx (err, null) ;
			})
		;
	} catch ( err ) {
		console.log ('DownloadAndSaveItemToDisk exception - ' + err) ;
	}
}

// .svf/.f2d/manifest additional references to download/create
function wf1_ReadSvfF2dManifest (results, callbacks_wf1c, bucket, identifier) {
	console.log ('#3 - Reading svf/f2d/manifest information') ;
	// Collect the additional elements
	async.parallel ([
			function (callback_p1a) {
				var svf =filterItems (results, '.*\\.svf$') ;
				async.map (
					svf,
					function (item, callback_map2) { wf1_ReadSvfItem (callback_map2, item, identifier, svf) ; },
					function (err, uris1) {
						if ( err ) {
							callback_p1a (err, null) ;
							return ;
						}
						var out =[] ;
						out =out.concat.apply (out, uris1) ;
						callback_p1a (null, out) ;
					}
				) ;
			},
			function (callback_p1b) {
				var f2d =filterItems (results, '.*\\.f2d$') ;
				async.map (
					f2d,
					function (item, callback_map3) { wf1_ReadF2dItem (callback_map3, item, identifier, f2d) ; },
					function (err, uris2) {
						if ( err ) {
							callback_p1b (err, null) ;
							return ;
						}
						var out =[] ;
						out =out.concat.apply (out, uris2) ;
						callback_p1b (null, out) ;
					}
				) ;
			},
			function (callback_p1c) {
				var manifest =filterItems (results, '.*manifest\\.json\\.gz$') ;
				async.map (
					manifest,
					function (item, callback_map4) { wf1_ReadManifest (callback_map4, item, identifier) ; },
					function (err, uris3) {
						if ( err ) {
							callback_p1c (err, null) ;
							return ;
						}
						var out =[] ;
						out =out.concat.apply (out, uris3) ;
						callback_p1c (null, out) ;
					}
				) ;
			}
		],
		function (err, uris) {
			if ( err ) {
				callbacks_wf1c (err, null) ;
				return ;
			}
			var out =results ;
			out =out.concat.apply (out, uris) ;
			callbacks_wf1c (null, out) ;
		}
	) ;
}

function filterItems (arr, criteria) {
	var filtered =arr.filter (function (obj) { return (new RegExp (criteria).test (obj.name)) ; }) ;
	return (filtered) ;
}

function wf1_ReadSvfItem (callback_map2, item, identifier, svf) {
	var uris =[] ;

	// Generate the document reference for local view html
	//var pathname =item.name ;
	//pathname =pathname.substring (pathname.indexOf ('/') + 1) ;
	//var name =path.basename (item.name) + '-' + svf.indexOf (item) ;
	//uris.push ({ 'path': pathname, 'name': name }) ;

	// Get manifest file
	fs.readFile ('data/' + item.name, function (err, content) {
		var ozip =new AdmZip (content) ;
		var zipEntries =ozip.getEntries () ;
		zipEntries.forEach (function (zipEntry) {
			if ( !zipEntry.isDirectory ) {
				if ( zipEntry.entryName == 'manifest.json' ) {
					var manifest =JSON.parse (zipEntry.getData ().toString ('utf8')) ;
					uris =uris.concat (loopManifest (manifest, path.dirname (item.urn))) ;
				}
			}
		}) ;

		callback_map2 (null, uris) ;
	}) ;
}

function wf1_ReadF2dItem (callback_map3, item, identifier, f2d) {
	var uris =[] ;

	// Generate the document reference for local view html
	//var pathname =item.name ;
	//pathname =pathname.substring (pathname.indexOf ('/') + 1) ;
	//var name =path.basename (item.name) + '-' + f2d.indexOf (item) ;
	//uris.push ({ 'path': pathname, 'name': name }) ;

	callback_map3 (null, uris) ;
}

function wf1_ReadManifest (callback_map4, item, identifier) {
	fs.readFile ('data/' + item.name, function (err, content) {
		//var unzipContent =zlib.unzipSync (content).toString ('utf8') ;
		zlib.unzip (content, function (err, unzipContent) {
			var manifest =JSON.parse (unzipContent) ;
			var uris =loopManifest (manifest, path.dirname (item.urn)) ;

			callback_map4 (null, uris) ;
		}) ;
	}) ;
}

function loopManifest (doc, urnParent) {
	var data =[] ;
	if ( doc.URI !== undefined &&  doc.URI.indexOf ('embed:/') != 0 ) // embed:/ - Resource embedded into the svf file, so just ignore it
	//data.push (urnParent + '/' + doc.URI) ;
		data.push (path.normalize (urnParent + '/' + doc.URI).split (path.sep).join ('/')) ;
	if ( doc.assets !== undefined ) {
		for ( var i in doc.assets )
			data =data.concat (loopManifest (doc.assets [i], urnParent)) ;
	}
	return (data) ;
}

// Get additional items from the previous extraction step
function wf1_GetAdditionalItems (uris, callback_wf1d, bucket, identifier) {
	// Download the additional elements
	console.log ('#4 - Download additional items asynchronously') ;
	async.mapLimit (uris, 10, // Let's have 10 workers only to limit lose of references (too many for the Autodesk server ;)
		function (item, callback_map5) { // Each tasks execution
			if ( typeof item != 'string' )
				return (callback_map5 (null, item)) ;
			//if ( item.indexOf ('thermal_moisture.roofing_siding panels.wood.horizontal.beige.png') != -1 )
			//	return (callback_map5 (null, item)) ;
			DownloadAndSaveItemToDisk (callback_map5, bucket, identifier, item) ;
		},
		function (err, results) { // All tasks are done
			if ( err !== undefined && err !== null ) {
				console.log ('Something wrong happened during download') ;
				callback_wf1d (err, null) ;
				return ;
			}
			callback_wf1d (null, results) ;
		}
	) ;
}

// Generate helper html/bat
function wf1_GenerateLocalHtml (refs, callback_wf1e, bucket, identifier) {
	var doclist =refs.filter (function (obj) { return (obj.hasOwnProperty ('path')) ; }) ;
	refs =refs.filter (function (obj) { return (!obj.hasOwnProperty ('path')) ; }) ;

	fs.createReadStream ('views/go.ejs').pipe (fs.createWriteStream ('data/' + identifier + '/index.bat')) ;
	refs.push ({ name: identifier + '/index.bat' }) ;
	fs.readFile ('views/view.ejs', 'utf-8', function (err, st) {
		if ( err )
			return (callback_wf1e (err, refs)) ;
		var data =ejs.render (st, { docs: doclist }) ;
		var fullnameHtml =identifier + '/index.html' ;
		fs.writeFile ('data/' + fullnameHtml, data, function (err) {
			if ( err ) {
				callback_wf1e (err, refs) ;
				return ;
			}

			refs.push ({ name: identifier + '/index.html' }) ;
			callback_wf1e (null, refs) ;
		}) ;
	}) ;
}

// Create a ZIP file and return all elements
function wf1End_PackItems (err, results, identifier) {
	if ( err ) {
		console.log ('Error in downloading fragments! ZIP not created.') ;
		return ;
	}
	// We got all d/l
	try {
		// We are done! Create a ZIP file
		var archive =archiver ('zip') ;
		archive.on ('error', function (err) {
			console.log ('Error: ZIP creation failed - ' + err)
		}) ;
		archive.on ('finish', function (err) {
			rimraf ('data/' + identifier, function (err) {}) ; // Cleanup
			console.log ('PackItems ended successfully.') ;
		}) ;

		//var output =fs.createWriteStream ('data/' + identifier + '/' + identifier + '.zip') ;
		var output =fs.createWriteStream ('www/extracted/' + identifier + '.zip') ;
		archive.pipe (output) ;

		var merged =[] ;
		merged =merged.concat.apply (merged, results) ;
		for ( var i =0 ; i < merged.length ; i++ ) {
			if ( !merged [i].hasOwnProperty ('error') )
				//archive.append (merged [i].content, { name: merged [i].name }) ;
				//archive.append (fs.createReadStream ('data/' + merged [i].name), { name: merged [i].name }) ;
				archive.file ('data/' + merged [i].name, { name: merged [i].name }) ;
		}
		archive.finalize () ;
	} catch ( err ) {
		console.log ('wf1End_PackItems exception') ;
	}
}

// Download a single file from its bucket/identifier/fragment pair
router.get ('/results/file/:bucket/:identifier/:fragment', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;
	var fragment =req.params.fragment ;

	fs.readFile ('data/' + bucket + '.' + identifier + '.resultdb.json', 'utf-8', function (err, data) {
		if ( err )
			return (res.status (404).end ()) ;
		data =JSON.parse (data) ;
		var guid =data.urn ;

		var urn ='urn:adsk.viewing:fs.file:' + guid + '/output/' + fragment ;
		new lmv.Lmv (bucket).downloadItem (urn)
			.on ('success', function (data) {
				res.setHeader ('Content-Type', 'application/octet-stream') ;
				res.attachment (path.basename (fragment)) ;
				res.end (data, 'binary') ;
			})
			.on ('fail', function (err) {
				res.status (404).end () ;
			})
		;
	}) ;
}) ;

module.exports =router ;

Array.prototype.unique =function () {
	var a =this.concat () ;
	for ( var i =0 ; i < a.length ; i++ ) {
		for ( var j =i + 1 ; j < a.length ; j++ ) {
			if ( a [i] === a [j] )
				a.splice (j--, 1) ;
		}
	}
	return (a) ;
} ;
