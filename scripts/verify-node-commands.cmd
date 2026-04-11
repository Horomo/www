@echo off
setlocal
set PATH=C:\Program Files\nodejs;%PATH%
cd /d %~dp0..
npm test
