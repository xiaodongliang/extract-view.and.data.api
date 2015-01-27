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

var express =require ('express') ;
var request =require ('request') ;
var fs =require ('fs') ;
var lmv =require ('./server/lmv') ;
var fileupload =require ('./server/fileupload') ;

var app =express () ;
app.use (express.static (__dirname + '/www')) ;
app.use ('/api', lmv) ;
app.use (fileupload) ;

app.set ('port', process.env.PORT || 80) ;
var server =app.listen (app.get ('port'), function () {
    console.log ('Server listening on port ' + server.address ().port) ;
}) ;
