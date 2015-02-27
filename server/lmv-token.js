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
var lmv =require ('./lmv') ;

function initializeApp () {
	fs.exists ('server/credentials.js', function (exists) {
		if ( exists ) {
			var seconds =1700 ; // Service returns 1799 seconds bearer token
			setInterval (lmv.Lmv.refreshToken, seconds * 1000) ;
			lmv.Lmv.refreshToken () ;
		} else {
			setTimeout (initializeApp, 1000) ;
		}
	}) ;
}
initializeApp () ;

var router =express.Router () ;
router.get ('/token', function (req, res) {
	res.setHeader ('Content-Type', 'text/plain') ;
	res.send (lmv.Lmv.getToken ()) ;
}) ;

router.post ('/setup', bodyParser.urlencoded ({ extended: false }), function (req, res) {
	var key =req.body.key.trim () ;
	var  secret =req.body.secret.trim () ;
	var data =fs.readFile ('server/credentials_.js', function (err, data) {
		if ( err ) {
			res.status (500).end ('No file named server/credentials_.js!') ;
			return ;
		}

		data =data.toString ('utf8') ;
		data =data.replace ('Replace_with_your_own_consumer_key', key) ;
		data =data.replace ('Replace_with_your_own_secret_key', secret) ;

		fs.writeFile ('server/credentials.js', data, function (err) {
			if ( err ) {
				res.status (500).end ('Cannot save server/credentials.js file!') ;
				return ;
			}
			res.writeHead (301, { Location: '/' }) ;
			res.end () ;
		}) ;
	}) ;
}) ;

module.exports =router ;
