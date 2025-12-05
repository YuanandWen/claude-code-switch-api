@echo off
chcp 65001 >nul
echo ===================================
echo  Claude Source Selector 安装程序
echo ===================================
echo.

REM 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 获取当前脚本目录
set "INSTALL_DIR=%~dp0"
set "CLAUDE_DIR=%USERPROFILE%\.claude"
set "SCRIPTS_DIR=%USERPROFILE%\Scripts"

echo [1/4] 检查目录...

REM 创建 .claude 目录（如果不存在）
if not exist "%CLAUDE_DIR%" (
    mkdir "%CLAUDE_DIR%"
    echo     创建目录: %CLAUDE_DIR%
)

REM 创建 Scripts 目录（如果不存在）
if not exist "%SCRIPTS_DIR%" (
    mkdir "%SCRIPTS_DIR%"
    echo     创建目录: %SCRIPTS_DIR%
)

echo [2/4] 复制脚本文件...

REM 复制 claude-selector.js 到 Scripts 目录
copy /Y "%INSTALL_DIR%claude-selector.js" "%SCRIPTS_DIR%\" >nul
echo     已复制: claude-selector.js

REM 复制 claude.bat 到 Scripts 目录
copy /Y "%INSTALL_DIR%claude.bat" "%SCRIPTS_DIR%\" >nul
echo     已复制: claude.bat

echo [3/4] 配置文件...

REM 检查配置文件是否存在
if exist "%CLAUDE_DIR%\claude-sources.json" (
    echo     配置文件已存在，跳过复制
) else (
    copy /Y "%INSTALL_DIR%claude-sources.example.json" "%CLAUDE_DIR%\claude-sources.json" >nul
    echo     已创建配置模板: claude-sources.json
    echo     [重要] 请编辑 %CLAUDE_DIR%\claude-sources.json 添加你的API源
)

echo [4/4] 检查环境变量...

REM 检查 Scripts 目录是否在 PATH 中
echo %PATH% | findstr /I /C:"%SCRIPTS_DIR%" >nul
if %errorlevel% neq 0 (
    echo.
    echo [警告] %SCRIPTS_DIR% 不在系统PATH中
    echo 请手动添加到系统环境变量，或运行以下命令:
    echo.
    echo     setx PATH "%%PATH%%;%SCRIPTS_DIR%"
    echo.
) else (
    echo     PATH 已配置正确
)

echo.
echo ===================================
echo  安装完成!
echo ===================================
echo.
echo 使用方法:
echo   1. 编辑配置文件: %CLAUDE_DIR%\claude-sources.json
echo   2. 在终端运行: claude
echo   3. 选择API源和模型
echo.
echo 如果 'claude' 命令不可用，请重启终端或添加PATH
echo.
pause
