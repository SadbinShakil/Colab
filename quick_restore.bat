@echo off
cd /d "C:\Users\100945766\Downloads\Thesis-master"
git reset --hard HEAD
git clean -fd
git checkout .
echo Project restored to last GitHub push state
pause
