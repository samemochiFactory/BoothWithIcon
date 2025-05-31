@echo off
setlocal
set "folder=%~dp0"
set "folder=%folder:~0,-1%"
echo target folder: %folder%
attrib +s +r "%folder%"
attrib +h +s "%folder%\desktop.ini"