@echo off
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0깃헙_자동업로드.ps1" > "%~dp0_push_log_now.txt" 2>&1
echo DONE >> "%~dp0_push_log_now.txt"
