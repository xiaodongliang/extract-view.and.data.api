@echo off
%~d0
cd /d %~dp0

set PATH=%PATH%;c\Program Files\MongoDB 2.6 Standard\bin
if not exist data\nul (mkdir data) else (del /q data\*.*)
mongod --dbpath %~dp0data
