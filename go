#!/bin/bash
cd /home/ubuntu/extract
/usr/local/bin/forever stop ./start.js
/usr/local/bin/forever start ./start.js