# workflow-node.js-server-view.and.data.api sample

<b>Note:</b> For using this sample, you need a valid oAuth credential for the translation / extraction portion.  Visit this [page](https://developer.autodesk.com) for instructions to get on-board.

## Motivation

Our View and Data API Beta adds powerful 2D and 3D viewing functionality to your web apps. Our REST and JavaScript API makes it easier to create applications that can view, zoom and interact with 2D and 3D models from over 60+ model formats with just a web browser, no plugin required!

But what if you wanted to view them offline? Many people ask how to proceed, while the documentation does not explicetely says how to do, the API is public. This sample will go through all the required steps.


## Description

The workflow-node.js-server-view.and.data.api sample exercises demonstrates the Autodesk View and Data API authorisation, translation, viewing processes mentioned in the Quick Start guide. It also demonstrate how to extract the 'bubbles' file from the Autodesk server for sotring and viewing them locally.

It closely follows the steps described in the documentation:

* http://developer.api.autodesk.com/documentation/v1/vs_quick_start.html

In order to make use of this sample, you need to register your consumer key:

* https://developer.autodesk.com > My Apps

This provides the credentials to supply to the http request on the Autodesk server.


## Dependencies

This sample is dependent of Node.js and few Node.js extensions which would update/install automatically via 'npm':

1. Node.js

    Node.js - built on Chrome's JavaScript runtime for easily building fast, scalable network applications<br />
	you need at least version v0.12.0. You can get this component [here](http://nodejs.org/)<br /><br />
	Node.js modules:
		"express": "*",
		"request": "*",
		"body-parser": "*",
		"fs": "*",
		"cron": "*",
		"connect-multiparty": "*",
		"path": "*",
		"mkdirp": "*",
		"util": "*",
		"stream": "*",
		"unirest": "*",
		"async": "*",
		"url": "*",
		"ejs" : "*",
		"adm-zip": "*",
		"archiver": "*",
		"rimraf": "*"

	 
## Setup/Usage Instructions
---------------------------

The sample was created using Node.js and javascript.

1. Download and install [Node.js](http://nodejs.org/) (that will install npm as well)
2. Download this repo anywhere you want (the server will need to write files, so make sure you install in a location where you have write permission)
3. 

You first need to modify (or create) the UserSettings.cs file and put your oAuth /ReCap credentials in it. An example of that file is provided as UserSettings_.cs.
	 
Use of the sample
-------------------------

* when you launch the sample, the application will try to connect to the ReCap server and verifies that you are properly authorized on the Autodesk oAuth server. 
If you are, it will refresh your access token immediately. If not, it will ask you to get authorized. Once you are authorized, close the oAuth dialog to continue.

* Shots Panel - you can Drag'nDrop images into the 'Photos' view and select the photos/shots you want. 

   * You can then create a new PhotoScene or add them to an existing PhotoScene. To create a new PhotoScene, right-click and select 'New PhotoScene from'
   the context menu. To add photos to an existing PhotoScene, switch to the 'ReCap Project' tab, select a project and choose 'Upload Photo(s)' from the context menu.
   * 'Remove' and 'Remove All' menus are to remove Photos from the list. They do not delete photos from PhotoScenes and/or your hard-drive.
   * The 'Presets' buttons are for helping the developers to debug - please ignore for now.
   
* ReCap Project Panel - the application will list all your projects from the ReCap server when you first open that tab.

   * Properties - You can get Project' properties from the server  by using the context menu and choosing 'Properties'. That will open a new dialog after the server returned the data.
   You can also call this method as many time you want as properties can be queried anytime.
   * Process Scene -  This command will ask the ReCap server to process the PhotoScene. You need a minimum of 3 photos to launch the processing, and this command is configured
   to for re-processing in case the scene was already processed.
   * Download result - If a PhotoScene was successfully processed, you can get the resulting ZIP file containing the mesh, texture, and material. The sample is configured to use OBJ file format.
   Other  file format will be supported in future whenever possible.
   * Preview - This command load the PhotoScene mesh into the 'Polygon 3D View' panel.
   * Delete - This command will ask the ReCap server to delete the PhotoScene and all its resources from the Autodesk server.
   
* Polygon 3D View - simple mesh preview with basic orbit functionality


--------

## License

This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT). Please see the [LICENSE](LICENSE) file for full details.


## Written by

Cyrille Fauvel (Autodesk Developer Network)  
http://www.autodesk.com/adn  
http://around-the-corner.typepad.com/  

