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
var timeout =require ('connect-timeout') ;

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
						hasThumbnail: data.hasThumbnail,
						status: data.status,
						success: data.success,
						progress: data.progress
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

// Get the bucket/identifier viewable data as a zip file containing all resources
router.get ('/results/:bucket/:identifier/project', timeout('900s'), function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;
	var urn =new lmv.Lmv (bucket).getURN (identifier) ;
	if ( urn == '' )
		return (res.status (404).end ()) ;

	try {
		if ( fs.existsSync ('data/' + identifier) )
			rimraf.sync ('data/' + identifier) ;
		mkdirp.sync ('data/' + identifier) ;
	} catch ( err ) {
	}
	async.waterfall ([
		// Get latest full details
		function (callbacks1) {
			new lmv.Lmv (bucket).all (urn)
				.on ('success', function (data) {
					if ( data.progress == 'complete' )
						fs.writeFile ('data/' + bucket + '.' + identifier + '.resultdb.json', JSON.stringify (data), function (err) {}) ;
					callbacks1 (null, data) ;
				})
				.on ('fail', function (err) {
					callbacks1 (err, null) ;
				})
			;
		},
		// From full details, get all individuals elements to download
		function (data, callbacks2) {
			var items =loopObject (data) ;
			items =items.filter (function (item) { return (item !== undefined) ; }) ;
			items.shift () ;
			async.map (items,
				function (item, callback) { // Each tasks execution
					new lmv.Lmv (bucket).downloadItem (item)
						.on ('success', function (data) {
							//var filename =item.split ('/').pop () ;
							var filename =path.basename (item) ;
							var fullpath ='data/' + identifier + '/' + item.substring (item.indexOf ('/output/') + 8)
							var filepath =path.dirname (fullpath) ;
							try {
								if ( !fs.existsSync (filepath) )
									mkdirp.sync (filepath) ;
								//console.log ('Saving: ' + fullpath) ;
								fs.writeFile (fullpath, data, function (err) {}) ;
							} catch ( err ) {
							}
							callback (null, { urn: item, name: fullpath.substring (5), content: data }) ;
						})
						.on ('fail', function (err) {
							callback (err, null) ;
						})
					;
				},
				function (err, results) { //- All tasks are done
					if ( err !== undefined )
						console.log ('Something wrong happened during download') ;
			 		callbacks2 (err, results) ;
				}
			) ;
		},
		// Any elements which has a .svf extension contains additional references to download
		function (results, callbacks3) {
			var uris =[ results ] ;
			// Collect the additional elements
			for ( var i =0 ; i < results.length ; i++ ) {
				if ( path.extname (results [i].name) == '.svf' ) {
					// Get manifest file
					var content =results [i].content ;
					var ozip =new AdmZip (content) ;
					var zipEntries =ozip.getEntries () ;
					zipEntries.forEach (function (zipEntry) {
						if ( !zipEntry.isDirectory ) {
							if ( zipEntry.entryName == 'manifest.json' ) {
								var manifest =JSON.parse (zipEntry.getData ().toString ('utf8')) ;
								uris =uris.concat (loopManifest (manifest, path.dirname (results [i].urn))) ;
							}
						}
					}) ;

					// Generate the html for local view
					var pathname =results [i].name.substring (results [i].name.indexOf ('/output/') + 8) ;
					pathname =pathname.substring (pathname.indexOf ('/') + 1) ;
					var fullname =identifier + '/' + path.basename (results [i].name) + '.html' ;
					var st =fs.readFileSync ('views/view.ejs', 'utf-8') ;
					var obj ={ svf: pathname, 'urn': '' } ;
					var data =ejs.render (st, obj) ;
					fs.writeFile ('data/' + fullname, data, function (err) {}) ;
					uris.push ({ name: fullname, content: data }) ;

					pathname =path.basename (fullname) ;
					st =fs.readFileSync ('views/go.ejs', 'utf-8') ;
					obj ={ html: pathname } ;
					data =ejs.render (st, obj) ;
					fullname =identifier + '/' + pathname + '.bat' ;
					fs.writeFile ('data/' + fullname, data, function (err) {}) ;
					uris.push ({ name: fullname, content: data }) ;
				} else if ( path.extname (results [i].name) == '.f2d' ) {
					// Generate the html for local view
					var pathname =results [i].name.substring (results [i].name.indexOf ('/output/') + 8) ;
					pathname =pathname.substring (pathname.indexOf ('/') + 1) ;
					var fullname =identifier + '/' + path.basename (results [i].name) + '.html' ;
					var st =fs.readFileSync ('views/view.ejs', 'utf-8') ;
					var obj ={ svf: pathname, 'urn': '' } ;
					var data =ejs.render (st, obj) ;
					fs.writeFile ('data/' + fullname, data, function (err) {}) ;
					uris.push ({ name: fullname, content: data }) ;

					pathname =path.basename (fullname) ;
					st =fs.readFileSync ('views/go.ejs', 'utf-8') ;
					obj ={ html: pathname } ;
					data =ejs.render (st, obj) ;
					fullname =identifier + '/' + pathname + '.bat' ;
					fs.writeFile ('data/' + fullname, data, function (err) {}) ;
					uris.push ({ name: fullname, content: data }) ;
				}
			}
			// Download the additional elements
			async.map (uris,
				function (item, callback) { // Each tasks execution
					if ( typeof item != 'string' )
						return (callback (null, item)) ;
					new lmv.Lmv (bucket).downloadItem (item)
						.on ('success', function (data) {
							//var filename =item.split ('/').pop () ;
							var filename =path.basename (item) ;
							var fullpath ='data/' + identifier + '/' + item.substring (item.indexOf ('/output/') + 8) ;
							var filepath =path.dirname (fullpath) ;
							try {
								if ( !fs.existsSync (filepath) )
									mkdirp.sync (filepath) ;
								fs.writeFile (fullpath, data, function (err) {}) ;
							} catch ( err ) {
							}
							callback (null, { urn: item, name: fullpath.substring (5), content: data }) ;
						})
						.on ('fail', function (err) {
							if ( err == 404 ) {
								console.log ('Error 404 - ' + item + ' <ignoring>') ;
								var fullpath ='data/' + identifier + '/' + item.substring (item.indexOf ('/output/') + 8) ;
								callback (null, { urn: item, name: fullpath.substring (5), content: null }) ;
							} else {
								console.log ('Error ' + err + ' - item') ;
								callback (err, null) ;
							}
						})
					;
				},
				function (err, results) { // All tasks are done
					if ( err !== undefined )
						console.log ('Something wrong happened during download') ;
					callbacks3 (err, results) ;
				}
			) ;
		}

	],
	// Create a ZIP file and return all elements
	function (err, results) {
		if ( err )
			return (res.status (404).end ()) ;
		// We got all d/l

		// We are done! Create a ZIP file and return
		res.setHeader ('Content-Type', 'application/zip') ;
		res.attachment (identifier + '.zip') ;

		var archive =archiver ('zip') ;
		archive.on ('error', function (err) {
			res.status (500).send ({ error: err.message }) ;
		}) ;
		res.on ('close', function () {
			//console.log ('Archive wrote %d bytes', archive.pointer ()) ;
			return (res.send ('OK').end ()) ;
		}) ;
		archive.pipe (res) ;

		var output =fs.createWriteStream ('data/' + identifier + '/' + identifier + '.zip') ;
		archive.pipe (output) ;

		try {
			var merged =[] ;
			merged =merged.concat.apply (merged, results) ;
			for ( var i =0 ; i < merged.length ; i++ )
				archive.append (merged [i].content, { name: merged [i].name }) ;
			archive.finalize () ;
			//fs.writeFile ('data/' + identifier + '/' + identifier + '.zip', archive.pointer (), function (err) {}) ;
		} catch ( err ) {
			res.status (500).send ({ error: err }) ;
		}

		/*walk ('data/' + identifier, function (err, results) {
			if ( err )
				throw err ;
			for ( var i =0 ; i < results.length ; i++ )
				archive.append (fs.createReadStream (results [i]), { name: results [i].substring (5) }) ;
			archive.finalize () ;
		}) ;*/

	}) ;
}) ;

function loopObject (doc) {
	var data =[] ;
	if ( doc.urn !== undefined )
		data.push (doc.urn) ;
	if ( doc.children !== undefined ) {
		for ( var i in doc.children )
			data =data.concat (loopObject (doc.children [i])) ;
	}
	return (data) ;
}

function loopManifest (doc, urnParent) {
	var data =[] ;
	if ( doc.URI !== undefined &&  doc.URI.indexOf ('embed:/') != 0 ) // embed:/ - Resource embedded into the svf file, so just ignore it
		//data.push (urnParent + '/' + doc.URI) ;
		data.push (path.normalize (urnParent + '/' + doc.URI).split ('\\').join ('/')) ;
	if ( doc.assets !== undefined ) {
		for ( var i in doc.assets )
			data =data.concat (loopManifest (doc.assets [i], urnParent)) ;
	}
	return (data) ;
}

// Download a single file from its bucket/identifier/fragment pair
router.get ('/results/file/:bucket/:identifier/:fragment', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;
	var fragment =req.params.fragment ;

	var data =fs.readFileSync ('data/' + bucket + '.' + identifier + '.resultdb.json') ;
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
			//console.log (err) ;
			res.status (404).end () ;
		})
	;
}) ;

router.get ('/results/test', function (req, res) {
	fs.readFile ('views/view.ejs', 'utf-8', function (err, data) {
		if ( !err ) {
			var obj = {
				urn: 'urn',
				svf: 'test'
			} ;
			var st =ejs.render (data, obj) ;
			res.end (st) ;
		} else {
			res.status (500). end () ;
		}
	}) ;
}) ;

var walk =function (dir, done) {
	var results =[] ;
	fs.readdir (dir, function (err, list) {
		if ( err )
			return (done (err)) ;
		var pending =list.length ;
		if ( !pending )
			return (done (null, results)) ;
		list.forEach (function (file) {
			file =dir + '/' + file ;
			fs.stat (file, function (err, stat) {
				if ( stat && stat.isDirectory () ) {
					walk (file, function (err, res) {
						results =results.concat (res) ;
						if ( !--pending )
							done (null, results) ;
					}) ;
				} else {
					results.push (file) ;
					if ( !--pending )
						done (null, results) ;
				}
			}) ;
		}) ;
	}) ;
} ;

router.get ('/results/test2', function (req, res) {
	var archive =archiver ('zip') ;
	var output =fs.createWriteStream ('data/example-output.zip') ;
	archive.pipe (output) ;

	walk ('data/773432-Stockbettdwg', function (err, results) {
		if ( err )
			throw err ;

		for ( var i =0 ; i < results.length ; i++ ) {
			var data =fs.createReadStream (results [i]) ;
			archive.append (data, { name: results [i].substring (5) }) ;
		}
		archive.finalize (function (err) {}) ;
	}) ;

	res.end ('ok') ;

}) ;

module.exports =router ;