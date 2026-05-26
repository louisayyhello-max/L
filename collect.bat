@echo off
:: 食品添加剂法规追踪 — 每日自动更新脚本
:: 用法：双击运行，或通过Windows任务计划程序定时执行

cd /d "%~dp0"
echo [%date% %time%] 开始抓取法规更新...
node api\collect.js >> logs\collect.log 2>&1
echo [%date% %time%] 完成。详见 logs\collect.log
