# workflow-node.js-server-view.and.data.api test suite

The tests have been designed to run locally and via a service like [Travis CI](https://travis-ci.org/).


### Setup
When you test locally, you can use any of the setup option describe in the [main readme](../README.md), but when the test
are ran on the Travis service site, you need to use system variables to define your credential keys in your Travis project settings
(Settings -> Environment Variables)

Define a CONSUMERKEY and CONSUMERSECRET system variables with the keys given to you on the
[Autodesk Developer portal](https://developer.autodesk.com/)

When you run locally, make sure to execute 'npm install --dev' as well. This command will download and install the
required node modules for developers automatically for you.
These modules are only required for the tests to run on your local machine.<br />
```
npm install --dev
```

### Create a test data set with a permanent bucket
In order to test some of the API in the sample, we need some data to be pre-created on your account. You can either create
the data set using this sample before running the tests, or use any of the other examples posted on our
[GitHub repo](https://github.com/Developer-Autodesk?utf8=%E2%9C%93&query=workflow).

Post the samples/Au.obj file in a permanent bucket named 'autotestpermament' + your consumer key in lowercase.
For example, if my consumer key is 'pc3fr7BzWdaCkAzr3G6RGFgfNwpOyA65', the bucket name will be: <br />
```
autotestpermamentpc3fr7bzwdackazr3g6rgfgfnwpoya65
```

You can also change the prefix bucket name by editing the support/en.js.

### Run the test
On [Travis CI](https://travis-ci.org/), it is launched automatically.

On your local machine, run the following command: <br />
```
npm test
```
