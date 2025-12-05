@echo off
REM Claude API Source Selector
REM 启动时选择API源和模型

REM 获取当前脚本所在目录
set "SCRIPT_DIR=%~dp0"

REM 如果有参数，直接启动claude（跳过选择）
if "%~1" neq "" (
    npx win-claude-code@latest %*
    exit /b
)

REM 无参数时运行选择器
node "%SCRIPT_DIR%claude-selector.js"
