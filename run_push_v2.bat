@echo off
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -EncodedCommand JgAgACcAQwA6AFwAVQBzAGUAcgBzAFwASABlAGUAQgBpAG4AXABEAG8AYwB1AG0AZQBuAHQAcwBcAGMAbABhAHUAZABlAFwAQQByAGcAdQBzACAAGMKMwRXI9LzAySAAFcisuVwAQ67Z1V8AkMfZs8XFXLjctC4AcABzADEAJwA= > "%~dp0_push_log_v2.txt" 2>&1
echo BATCH DONE >> "%~dp0_push_log_v2.txt"
