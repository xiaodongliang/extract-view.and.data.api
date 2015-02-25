# workflow-node.js-server-view.and.data.api sample

<b>Note:</b> For using this sample, you need a valid oAuth credential for the translation / extraction portion.
Visit this [page](https://developer.autodesk.com) for instructions to get on-board.

## Motivation

Our View and Data API Beta adds powerful 2D and 3D viewing functionality to your web apps.
Our REST and JavaScript API makes it easier to create applications that can view, zoom and interact with 2D and
3D models from over 60+ model formats with just a web browser, no plugin required!

But what if you wanted to view them offline? Many people ask how to proceed, while the documentation
does not explicitly says how to proceed, however the API is public and documented.
This sample will go through all the required steps.


## Description

The workflow-node.js-server-view.and.data.api sample exercises demonstrates the Autodesk View and Data API authorization,
translation, viewing processes mentioned in the Quick Start guide. It also demonstrates how to extract the 'bubbles' files
from the Autodesk server for storing and viewing them locally.

It closely follows the steps described in the documentation:

* http://developer.api.autodesk.com/documentation/v1/vs_quick_start.html

In order to make use of this sample, you need to register your consumer key:

* https://developer.autodesk.com > My Apps

This provides the credentials to supply to the http request on the Autodesk server.


## Dependencies

This sample is dependent of Node.js and few Node.js extensions which would update/install automatically via 'npm':

1. Node.js

    Node.js - built on Chrome's JavaScript runtime for easily building fast, scalable network applications.
	You need at least version v0.10.0. You can get Node.js from [here](http://nodejs.org/)<br /><br />
	Node.js modules:
	```
    "express": ">= 4.11.1",
    "request": ">= 2.51.0",
    "body-parser": ">= 1.11.0",
    "fs": ">= 0.0.2",
    "cron": ">= 1.0.6",
    "connect-multiparty": ">= 1.2.5",
    "path": ">= 0.11.14",
    "mkdirp": ">= 0.5.0",
    "util": ">= 0.10.3",
    "stream": ">= 0.0.2",
    "unirest": ">= 0.4.0",
    "async": ">= 0.9.0",
    "url": ">= 0.10.2",
    "ejs" : ">= 2.2.4",
    "adm-zip": ">= 0.4.7",
    "archiver": ">= 0.14.3",
    "rimraf": ">= 2.2.8"
	```
		
2. flow.js - A JavaScript library providing multiple simultaneous, stable, fault-tolerant and resumable/restartable
   file uploads via the HTML5 File API, available [here](https://github.com/flowjs/flow.js).

3. fancytree.js - Tree plugin for jQuery with support for persistence, keyboard, checkboxes, tables (grid), drag'n'drop,
   and lazy loading, available [here](https://github.com/mar10/fancytree).

	 
## Setup/Usage Instructions

The sample was created using Node.js and javascript.

### Setup
1. Download and install [Node.js](http://nodejs.org/) (that will install npm as well)
2. Download this repo anywhere you want (the server will need to write files, so make sure you install in
   a location where you have write permission, at least the 'tmp' and 'data' folders)
3. Go in the ./server folder, and copy the credentials_.js into credentials.js<br />
   * Windows<br />
     ```
     copy credentials_.js credential.js
     ```
   * OSX/Linux<br />
     ```
     cp credentials_.js credential.js
     ```
4. Edit credentials.js and replace keys placeholder (ClientId and ClientSecret) with your keys
5. Go in the sample root folder and execute 'npm install', this command will download and install
   the required node modules automatically for you.
   These modules are only required for the translation/extraction processes.<br />
   ```
   npm install
   ```
6. You are done for the setup, launch the node server using the command '[sudo] node start.js [port]'.
   sudo is required only on OSX and Linux.<br />
   ```
   sudo node start.js
   ```
   <br />
   <b>Note:</b> the port argument can be omitted and default to port 80. If port 80 is already in use by another
   application, you can use any other free port such as 8000, 3000, etc... But in the next section you would
   need to specify the port to use, i.e. http://localhost[:port]/

### Use of the sample

Translating files / Extracting 'bubbles'

1. Start your favorite browser supporting HTML5 and WEBGL and browse to [http://localhost/](http://localhost/)
2. Drag'n Drop your files into the 'Drop area' or browse for individual files.
   Tips: start with the main file in your file has dependencies, that will build the connections automatically.
3. If a connection is not correct, delete the connection by click on the connection line, and build a new connection
   starting from the parent 'yellow' square to the child dependency.
4. Once all files are uploaded on your local server and connections/dependencies are correct, give a bucket name,
   and submit the project to the Autodesk server for translating your file to a lightweight WEBGL format.
5. After the translation completed successfully, move your mouse over the project thumbnail at the bottom of the page
   and press the 'Explore' button,
6. On the new page, press the 'Download' button to download your 'bubbles' files.
7. You are done with translation and extraction.

Viewing 'bubbles' offline using Node.js

1. This step needs to be done only once per machine. Setup Node.js http-server server.<br />
   ```
   npm install http-server -g
   ```
2. Unzip the project result zip file into a folder.
3. Download and unzip the 'Autodesk viewer engine' in the same folder.
4. Start your local node http-server server.<br />
   ```
   [sudo] http-server <myfolder>
   ```
5. Start your favorite browser supporting HTML5 and WEBGL and browse to [http://localhost:8080/](http://localhost:8080/)
   and select any of the html *.svf.* files.<br />
   (or execute any .bat file located in your folder - usually '0.svf.html.bat' or shell script if you are on OSX or Linux - usually '0.svf.html.sh')

Viewing 'bubbles' offline using Python

1. This step needs to be done only once per machine. Downlaod and install Python on your computer.
2. Unzip the project result zip file into a folder.
3. Download and unzip the 'Autodesk viewer engine' in the same folder.
4. Start your local Python http server.<br />
   ```
   cd <myfolder>
   python -m SimpleHTTPServer
   ```
5. Start your favorite browser supporting HTML5 and WEBGL and browse to
   [http://localhost:8000/](http://localhost:8000/) and select any of the html *.svf.* files.


## Package an offline viewing solutions

### Package with Python

On Windows only: simply copy the Python directory on your CD, and launch the server via a script when your application wants to show a LMV result. Make sure to set the PATH to point to your CD Python location to avoid errors.
On OSX, Linux: Python is already installed, so you can use the default Python on these OS.

### Deploy with Node/http-server

TBD


--------

## License

This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT). Please see the [LICENSE](LICENSE) file for full details.


## Written by

Cyrille Fauvel (Autodesk Developer Network)<br />
http://www.autodesk.com/adn<br />
http://around-the-corner.typepad.com/<br />
