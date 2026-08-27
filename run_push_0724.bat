@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0깃헙_자동업로드.ps1" > "%~dp0_push_log_0724.txt" 2>&1
echo DONE >> "%~dp0_push_log_0724.txt"
