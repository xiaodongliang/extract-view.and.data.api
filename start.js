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

// to avoid the EXDEV rename error, see http://stackoverflow.com/q/21071303/76173
process.env.TMPDIR ='tmp' ;
//process.env ['NODE_TLS_REJECT_UNAUTHORIZED'] ='0' ; // Ignore 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' authorization error

var express =require ('express') ;
var request =require ('request') ;
var bodyParser =require ('body-parser') ;
var fs =require ('fs') ;
var lmvToken =require ('./server/lmv-token') ;
var lmvProjects =require ('./server/lmv-projects') ;
var lmvResults =require ('./server/lmv-results') ;
var lmvFile =require ('./server/file') ;
var ejs =require ('./server/ejs') ;

// http://garann.github.io/template-chooser/
var app =express () ;
app.use (bodyParser.json ()) ;
app.use (express.static (__dirname + '/www')) ;
app.set ('view engine', 'ejs') ;
app.use ('/project', ejs) ;
app.use ('/api', lmvToken) ;
app.use ('/api', lmvProjects) ;
app.use ('/api', lmvResults) ;
app.use ('/api', lmvFile) ;

app.set ('port', process.env.PORT || 80) ;
var server =app.listen (app.get ('port'), function () {
    console.log ('Server listening on port ' + server.address ().port) ;
}) ;
