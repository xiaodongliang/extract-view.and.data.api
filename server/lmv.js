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
var fs =require ('fs') ;
//var cron =require ('cron').CronJob ;
var credentials =require ('./credentials') ;

/*new cron ('* * * * * *', function () {
		console.log ('You will see this message every second') ;
	}, null, true, "America/Los_Angeles"
) ;*/

function refreshLMVToken () {
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
					if (err)
						return (console.log (err)) ;
					console.log ('Token: ' + JSON.stringify (authResponse)) ;
				}) ;
			}
		}
	) ;
}

var seconds =1700 ; // Service returns 1799 seconds bearer token
setInterval (refreshLMVToken, seconds * 1000) ;
refreshLMVToken () ;

function getLMVToken () {
	var data =fs.readFileSync ('token.txt') ;
	try {
		var authResponse =JSON.parse (data) ;
		return (authResponse.access_token) ;
	} catch ( err ) {
		console.log (err) ;
	}
	return ('') ;
}

var router =express.Router () ;
router.get ('/lmv', function (req, res) {
	res.send (getLMVToken ()) ;
}) ;

module.exports =router ;
