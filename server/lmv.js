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
var unirest =require('unirest') ;
var events =require('events') ;
var util =require ('util') ;
//var querystring =require ('querystring') ;
var fs =require ('fs') ;
var credentials =require ('./credentials') ;

if ( !Number.isInteger ) {
	Number.isInteger =function isInteger (nVal) {
		return (
			   typeof nVal === 'number'
			&& isFinite (nVal)
			&& nVal > -9007199254740992
			&& nVal < 9007199254740992
			&& Math.floor (nVal) === nVal
		) ;
	} ;
}

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
	unirest.post (creds.AuthenticateUrl)
		.header ('Accept', 'application/json')
		.type ('application/x-www-form-urlencoded')
		.send (params)
		.end (function (response) {
			try {
				if ( response.statusCode != 200 )
					throw 'error' ;
				var authResponse =response.body ;
				console.log ('Token: ' + JSON.stringify (authResponse)) ;
				//authResponse.expires_at =Math.floor (Date.now () / 1000) + authResponse.expires_in ;
				fs.writeFile ('data/token.json', JSON.stringify (authResponse), function (err) {
					if ( err )
						throw err ;
				}) ;
			} catch ( err ) {
				fs.unlinkSync ('data/token.json') ;
				console.log ('Token: ERROR! (' + response.statusCode + ')') ;
			}
		})
	;
} ;

/*static*/ Lmv.getToken =function () {
	var data =fs.readFileSync ('data/token.json') ;
	try {
		var authResponse =JSON.parse (data) ;
		return (authResponse.access_token) ;
	} catch ( err ) {
		console.log (err) ;
	}
	return ('') ;
} ;

Lmv.prototype.checkBucket =function () {
	var self =this ;
	this.performRequest (
		'get',
		'/oss/v1/buckets/' + this.bucket + '/details',
		null,
		function (data) {
			if ( data.hasOwnProperty ('key') ) {
				console.log ('Bucket ' + JSON.stringify (data)) ;
				self.emit ('success', data) ;
			} else {
				self.emit ('fail', data) ;
			}
		},
		function (err) {
			self.emit ('fail', err) ;
		}
	) ;
	return (this) ;
} ;

Lmv.prototype.createBucket =function (policy) {
	policy =policy || 'transient' ;
	var self =this ;
	this.performRequest (
		'post',
		'/oss/v1/buckets',
		{ 'bucketKey': this.bucket, 'policy': policy },
		function (data) {
			if ( data.hasOwnProperty ('key') ) {
				console.log ('Bucket ' + JSON.stringify (data)) ;
				fs.writeFile ('data/' + data.key + '.bucket.json', JSON.stringify (data), function (err) {
					if ( err )
						return (console.log ('ERROR: bucket data not saved :(')) ;
				}) ;
				self.emit ('success', data) ;
			} else {
				self.emit ('fail', data) ;
			}
		},
		function (err) {
			self.emit ('fail', err) ;
		}
	) ;
	return (this) ;
} ;

Lmv.prototype.createBucketIfNotExist =function (policy) {
	policy =policy || 'transient' ;
	var self =this ;
	this.performRequest (
		'get',
		'/oss/v1/buckets/' + this.bucket + '/details',
		null,
		function (data) {
			if ( data.hasOwnProperty ('key') ) {
				console.log ('Bucket ' + JSON.stringify (data)) ;
				self.emit ('success', data) ;
			} else {
				self.emit ('fail', data) ;
			}
		},
		function (err) {
			//- We need to create one if error == 404 (404 Not Found)
			if ( Number.isInteger (err) && err == 404 ) {
				new Lmv (self.bucket).createBucket (policy)
					.on ('success', function (data) {
						console.log ('Bucket ' + JSON.stringify (data)) ;
						self.emit ('success', data) ;
					})
					.on ('fail', function (err2) {
						self.emit ('fail', err2) ;
					}
				) ;
			} else {
				self.emit ('fail', err);
			}
		}
	) ;
	return (this) ;
} ;

Lmv.prototype.uploadFile =function (identifier) {
	var self =this ;
	var creds =new credentials () ;
	var data =fs.readFileSync ('data/' + identifier + '.json') ;
	data =JSON.parse (data) ;
	var serverFile =__dirname + '/../tmp/flow-' + identifier + '.1' ;

	var endpoint ='/oss/v1/buckets/' + this.bucket + '/objects/' + data.name.replace (/ /g, '+') ;
	unirest.put (creds.BaseUrl + endpoint)
		.headers ({ 'Accept': 'application/json', 'Content-Type': 'application/octet-stream', 'Authorization': ('Bearer ' + Lmv.getToken ()) })
		.attach ('file', serverFile)
		.end (function (response) {
			//console.log (response.body) ;
			try {
				if ( response.statusCode != 200 )
					throw response.statusCode ;
				fs.writeFile ('data/' + self.bucket + '.' + identifier + '.json', JSON.stringify (response.body), function (err) {
					if ( err )
						throw err ;
					self.emit ('success', response.body) ;
				}) ;
			} catch ( err ) {
				fs.unlinkSync ('data/' + self.bucket + '.' + identifier + '.json') ;
				self.emit ('fail', err) ;
			}
		})
	;
	return (this) ;
} ;

Lmv.prototype.getURN =function (identifier) {
	try {
		var data =fs.readFileSync ('data/' + this.bucket + '.' + identifier + '.json') ;
		data =JSON.parse (data) ;
		return (data.objects [0].id) ;
	} catch ( err ) {
		console.log (err) ;
	}
	return ('') ;
} ;

/*static*/ Lmv.getFilename =function (identifier) {
	var data =fs.readFileSync ('data/' + identifier + '.json') ;
	data =JSON.parse (data) ;
	return (data.name) ;
} ;

Lmv.prototype.setDependencies =function (connections) {
	var self =this ;
	if ( connections == null ) {
		self.emit ('success', { 'status': 'ok', 'statusCode': 200 }) ;
		return (this) ;
	}
	var creds =new credentials () ;

	var desc ={ 'dependencies': [] } ;
	var master ='' ;
	for ( var key in connections ) {
		if ( key == 'lmv-root' ) {
			master =connections [key] [0] ;
			desc.master =this.getURN (master) ;
		} else { //if ( !data [key].hasOwnProperty (children) )
			for ( var subkey in connections [key] ) {
				var obj = {
					'file': this.getURN (connections [key] [subkey]),
					'metadata': {
						'childPath': Lmv.getFilename (connections [key] [subkey]),
						'parentPath': Lmv.getFilename (key)
					}
				} ;
				desc.dependencies.push (obj) ;
			}
		}
	}
	fs.writeFile ('data/' + this.bucket + '.' + master + '.connections.json', JSON.stringify (desc), function (err) {
		if ( err )
			console.log ('ERROR: bucket project connections not saved :(') ;
	}) ;

	var endpoint ='/references/v1/setreference' ;
	unirest.post (creds.BaseUrl + endpoint)
		.headers ({ 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': ('Bearer ' + Lmv.getToken ()) })
		.send (desc)
		.end (function (response) {
			try {
				if ( response.statusCode != 200 )
					throw response.statusCode ;
				self.emit ('success', { 'status': 'ok', 'statusCode': 200 }) ;
			} catch ( err ) {
				self.emit ('fail', err) ;
			}
		})
	;
	return (this) ;
} ;

Lmv.prototype.register =function (connections) {
	var self =this ;
	var creds =new credentials () ;
	var urn =this.getURN (connections ['lmv-root'] [0]) ;
	var desc ={ 'urn': new Buffer (urn).toString ('base64') } ;

	var endpoint ='/viewingservice/v1/register' ;
	unirest.post (creds.BaseUrl + endpoint)
		.headers ({ 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': ('Bearer ' + Lmv.getToken ()) })
		.send (desc)
		.end (function (response) {
			try {
				if ( response.statusCode != 200 && response.statusCode != 201 )
					throw response.statusCode ;
				self.emit ('success', { 'status': 'ok', 'statusCode': response.statusCode }) ;
			} catch ( err ) {
				self.emit ('fail', err) ;
			}
		})
	;
	return (this) ;
} ;

Lmv.prototype.status =function (urn) {
	var self =this ;
	var creds =new credentials () ;
	var encodedURN =new Buffer (urn).toString ('base64') ;

	var endpoint ='/viewingservice/v1/' + encodedURN + '/status' ;
	unirest.get (creds.BaseUrl + endpoint)
		.headers ({ 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': ('Bearer ' + Lmv.getToken ()) })
		.end (function (response) {
			try {
				if ( response.statusCode != 200 )
					throw response.statusCode ;
				self.emit ('success', { 'status': 'ok', 'statusCode': 200, 'progress': response.body.progress, 'body': response.body }) ;
			} catch ( err ) {
				self.emit ('fail', err) ;
			}
		})
	;
	return (this) ;
} ;

Lmv.prototype.performRequest =function (method, endpoint, data, success, fail) {
	var creds =new credentials () ;
	method =method.toLowerCase () ;
	var req =unirest (method, creds.BaseUrl + endpoint)
		.header ('Accept', 'application/json')
		.header ('Content-Type', 'application/json')
		//.header ('Content-Length', 0)
		//.header ('Accept', 'application/json')
		.header ('Authorization', 'Bearer ' + Lmv.getToken ())
		//.header ('Connection', 'keep-alive')
		//.options ({ 'strictSSL': false })
		//.strictSSL (false)
		//.proxy ('127.0.0.1:8888')
		//.query (data)
	;

	if ( data != null && method == 'get' )
		req.query (data) ;
	if ( data != null && method == 'post' )
		req.send (data) ;

	req.end (function (response) {
			try {
				if ( response.statusCode != 200 )
					throw response.statusCode ;
				success (response.body) ;
			} catch ( err ) {
				fail (err) ;
			}
		}
	) ;

} ;

var router =express.Router () ;
router.Lmv =Lmv ;

module.exports =router ;
