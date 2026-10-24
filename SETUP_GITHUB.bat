@echo off
title StudyMind AI - GitHub Setup by Vipin Pal
color 0A
echo.
echo  ============================================
echo   StudyMind AI - GitHub Setup
echo   Created by Vipin Pal (BTech CSE CyberSec)
echo  ============================================
echo.

:: Step 1: Install Git if not present
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/5] Installing Git...
    winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
    echo.
    echo Git installed! Please CLOSE and RE-RUN this script.
    pause
    exit
) else (
    echo [1/5] Git is already installed. OK!
)

:: Step 2: Configure Git
echo [2/5] Configuring Git...
git config --global user.name "Vipin Pal"
git config --global user.email "palv10865@github.com"
git config --global init.defaultBranch main
echo Done!

:: Step 3: Init repo
echo [3/5] Initializing repository...
cd /d "c:\Users\Vipin Pal\Desktop\StudentAi"
git init
git remote remove origin 2>nul
git remote add origin https://github.com/palv10865/StudentAi.git
echo Done!

:: Step 4: Stage all files
echo [4/5] Staging files...
git add -A
git commit -m "StudyMind AI - BTech Tutor by Vipin Pal (Initial Release)"
echo Done!

:: Step 5: Push
echo [5/5] Pushing to GitHub...
echo.
echo NOTE: A browser window or login prompt will open.
echo Log in with your GitHub account when asked.
echo.
git push -u origin main --force
echo.

if %errorlevel% == 0 (
    echo  ============================================
    echo   SUCCESS! App pushed to GitHub!
    echo.
    echo   Website URL (after enabling Pages):
    echo   https://palv10865.github.io/StudentAi/
    echo.
    echo   Next: Go to your repo Settings ^> Pages
    echo         Set Source = GitHub Actions
    echo  ============================================
) else (
    echo  Push failed. Trying with 'master' branch...
    git push -u origin master --force
)

echo.
pause
