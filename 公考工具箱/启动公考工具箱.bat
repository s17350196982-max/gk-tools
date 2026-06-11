@echo off
cd /d "%~dp0.."
title 公考工具箱
echo.
echo  ╔══════════════════════════════╗
echo  ║     公考工具箱 启动中...     ║
echo  ╚══════════════════════════════╝
echo.
echo  → 请用浏览器访问: http://localhost:8080
echo  → 按 Ctrl+C 停止服务器
echo.
python -m http.server 8080
pause
