Set WshShell = CreateObject("WScript.Shell")

' Get current directory of this script
currentDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptPosition)
WshShell.CurrentDirectory = currentDir

' Start backend server silently (0 hides the window)
WshShell.Run "cmd.exe /c "".node\node-v22.12.0-win-x64\node.exe"" server/server.js", 0, false

' Start frontend server silently (0 hides the window)
WshShell.Run "cmd.exe /c "".node\node-v22.12.0-win-x64\npm.cmd"" run dev", 0, false
