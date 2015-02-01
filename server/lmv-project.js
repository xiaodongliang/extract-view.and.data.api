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

var router =express.Router () ;
router.use (bodyParser.json ()) ;

router.post ('/submit', function (req, res) {
	var data ;
	try {
		data =JSON.parse (fs.readFileSync ('files.txt')) ;
	} catch ( err ) {
		res.status (400) ;
		res.send ('Database corrupted!') ;
		return ;
	}
	var buckets ;
	try {
		buckets =JSON.parse (fs.readFileSync ('buckets.txt')) ;
	} catch ( err ) {
		buckets ={} ;
	}
    var bucket =req.body.bucket ;
	if ( !buckets.hasOwnProperty (bucket) )
		buckets [bucket] =[] ;
	
	var connections =req.body.connections ;
	for ( var key in connections ) {
        if ( key == 'lmv-root' )
			buckets [bucket] =buckets [bucket].concat (connections [key]).unique () ;
        else //if ( !data [key].hasOwnProperty (children) )
            data [key] ['children'] =connections [key] ;
	}
	
	fs.writeFile ('files.txt', JSON.stringify (data), function (err) {
		if ( err )
			console.log (err) ;
	}) ;
	fs.writeFile ('buckets.txt', JSON.stringify (buckets), function (err) {
		if ( err )
			console.log (err) ;
	}) ;
	
	res.send (req.body) ;    // echo the result back

}) ;

router.get ('/submit', function (req, res) {
	var l =new lmv.Lmv ('cyrille') ;
	l.checkBucket ()
		.on ('success', function (data) {
			res.send (data) ;
		})
		.on ('fail', function (err) {
			res.status (400) ;
			res.send ('No such bucket') ;
		}) ;
}) ;

module.exports =router ;
