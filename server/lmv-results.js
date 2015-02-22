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
var async =require ('async') ;
var lmv =require ('./lmv') ;
var AdmZip =require ('adm-zip') ;

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
router.get ('/results/:bucket/:identifier/project', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;
	var urn =new lmv.Lmv (bucket).getURN (identifier) ;
	if ( urn == '' )
		return (res.status (404).end ()) ;

	try {
		fs.mkdirSync ('data/' + identifier) ;
	} catch ( err ) {
	}
	async.waterfall ([
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
								fs.writeFile (fullpath, data, 'binary', function (err) {}) ;
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

		function (results, callbacks3) {
			var uris =[ results ] ;
			for ( var i =0 ; i < results.length ; i++ )
				if ( path.extname (results [i].name) == '.svf' )
					break ;
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

			async.map (uris,
				function (item, callback) { // Each tasks execution
					if ( typeof item != 'string' )
						return (callback (null, item)) ;
					new lmv.Lmv (bucket).downloadItem (item)
						.on ('success', function (data) {
							//var filename =item.split ('/').pop () ;
							var filename =path.basename (item) ;
							var fullpath ='data/' + identifier + '/' + item.substring (item.indexOf ('/output/') + 8)
							var filepath =path.dirname (fullpath) ;
							try {
								if ( !fs.existsSync (filepath) )
									mkdirp.sync (filepath) ;
								fs.writeFile (fullpath, data, 'binary', function (err) {}) ;
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
					callbacks3 (err, results) ;
				}
			) ;
		}

	], function (err, results) {
		if ( err )
			return (res.status (404).end ()) ;
		//- We are done! Create a ZIP file and return
		var ozip =new AdmZip () ;
		try {
			var merged =[] ;
			merged =merged.concat.apply (merged, results) ;
			for ( var i =0 ; i < merged.length ; i++ )
				ozip.addFile (merged [i].name, merged [i].content) ;
		} catch ( err ) {
		}
		var data =ozip.toBuffer () ;
		ozip.writeZip ('data/' + identifier + '/' +identifier + '.zip') ;

		res.setHeader ('Content-Type', 'application/zip') ;
		res.attachment (identifier + '.zip') ;
		res.end (data, 'binary') ;
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
		data.push (urnParent + '/' + doc.URI) ;
	if ( doc.assets !== undefined ) {
		for ( var i in doc.assets )
			data =data.concat (loopManifest (doc.assets [i], urnParent)) ;
	}
	return (data) ;
}

// Download a single file from its bucket/identifier pair
router.get ('/results/:bucket/:identifier/xxx', function (req, res) {
	var bucket =req.params.bucket ;
	var identifier =req.params.identifier ;

	var data =fs.readFileSync ('data/' + bucket + '.' + identifier + '.resultdb.json') ;
	data =JSON.parse (data) ;

	var urn ="urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Y3lyaWxsZS0yMDE1MDIxOS9TdG9ja2JldHQuZHdn/output/b1ff643c-c779-b885-0009-33db311f4f75/0.svf" ;
	//var urn ="urn:adsk.viewing:fs.file:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Y3lyaWxsZS0yMDE1MDIwNC9BdS5vYmo=/output/properties.db" ;
	//var urn ="dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Y3lyaWxsZS0yMDE1MDIwNC9BdS5vYmo=" ;

	new lmv.Lmv (bucket).downloadItem (urn)
		.on ('success', function (data) {
			//console.log (data) ;
			res.setHeader ('Content-Type', 'application/octet-stream') ;
			res.setHeader ('Content-Transfer-Encoding', 'binary') ;
			res.attachment ('Au.obj.svf') ;
			//res.attachment ('xxx.db') ;
			res.send (data).end () ;
		})
		.on ('fail', function (err) {
			//console.log (err) ;
			res.status (404).end () ;
		})
	;
}) ;

module.exports =router ;