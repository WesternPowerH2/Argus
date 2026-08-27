@echo off
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "'PS RAN OK ' + (Get-Date) | Out-File -FilePath '%~dp0_ps_test.txt' -Encoding utf8"
echo BATCH DONE > "%~dp0_ps_test_batch.txt"
