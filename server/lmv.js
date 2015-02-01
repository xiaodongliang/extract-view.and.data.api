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
// http://blog.niftysnippets.org/2008/03/mythical-methods.html
//
var express =require ('express') ;
var request =require ('request') ;
var https =require ('https') ;
var querystring =require ('querystring') ;
var events =require('events') ;
var util =require ('util') ;
var fs =require ('fs') ;
var credentials =require ('./credentials') ;

function Lmv (bucketName) {
	events.EventEmitter.call (this) ;
	this.bucket =bucketName ;
}
//Lmv.prototype.__proto__ =events.EventEmitter.prototype ;
util.inherits (Lmv, events.EventEmitter) ;

/*static*/ Lmv.refreshToken =function () {
	console.log ('Refreshing Autodesk Service token') ;

	var creds =new credentials () ;
	var params ={
		client_id: creds.ClientId,
		client_secret: creds.ClientSecret,
		grant_type: 'client_credentials'
	}
	request.post (
		creds.AuthenticateUrl,
		{ form: params },
		function (error, response, body) {
			if ( !error && response.statusCode == 200 ) {
				var authResponse =JSON.parse (body) ;
				//authResponse.expires_at =Math.floor (Date.now () / 1000) + authResponse.expires_in ;
				fs.writeFile ('token.txt', JSON.stringify (authResponse), function (err) {
					if ( err )
						return (console.log (err)) ;
					console.log ('Token: ' + JSON.stringify (authResponse)) ;
				}) ;
			}
		}
	) ;
} ;

/*static*/ Lmv.getToken =function () {
	var data =fs.readFileSync ('token.txt') ;
	try {
		var authResponse =JSON.parse (data) ;
		return (authResponse.access_token) ;
	} catch ( err ) {
		console.log (err) ;
	}
	return ('') ;
} ;

Lmv.prototype.checkBucket =function () {
	this.success =function (data) {
		if ( data.hasOwnProperty ('key') )
			this.emit ('success', data) ;
		else
			this.emit ('fail', data) ;
	} ;
	this.fail =function (err) {
		this.emit ('fail', err) ;
	} ;

	this.performRequest (
		'/oss/v1/buckets/' + this.bucket + '/details',
		'GET',
		null,
		this.success, this.fail
	) ;
	return (this) ;
} ;

Lmv.prototype.createBucket =function (bucketName) {
	/*var options ={
		host: url,
		port: 80,
		path: '/resource?id=foo&bar=baz',
		method: 'POST'
	} ;
	http.request (options, function (res) {
		console.log ('STATUS: ' + res.statusCode) ;
		console.log ('HEADERS: ' + JSON.stringify(res.headers)) ;
		res.setEncoding ('utf8') ;
		res.on ('data', function (chunk) {
			console.log('BODY: ' + chunk) ;
		}) ;
	}).end () ;
	*/

} ;

Lmv.prototype.performRequest =function (endpoint, method, data, success, fail) {
	var dataString =data == null ? '' : JSON.stringify (data) ;
	var headers ={} ;

	if ( method == 'GET' && data != null )
		endpoint +='?' + querystring.stringify (data) ;
	else if ( method == 'POST' )
		headers ={
			'Content-Type': 'application/json',
			'Content-Length': dataString.length
		} ;
	headers ['Authorization'] ='Bearer ' + Lmv.getToken () ;

	var creds =new credentials () ;
	var options ={
		hostname: creds.Hostname,
		path: endpoint,
		method: method,
		headers: headers//,
	} ;

	var req =https.request (options, function (res) {
		res.setEncoding ('utf-8') ;
		var responseString ='' ;
		res.on ('data', function (data) {
			responseString +=data ;
		}) ;
		res.on ('end', function () {
			console.log (responseString) ;
			var responseObject ={} ;
			try {
				responseObject =JSON.parse (responseString) ;
				success (responseObject) ;
			} catch ( err ) {
				fail (err) ;
				return ;
			}
		}) ;
	}) ;

	req.write (dataString) ;
	req.end () ;
} ;

var router =express.Router () ;
router.Lmv =Lmv ;

module.exports =router ;
