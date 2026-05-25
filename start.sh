#!/bin/bash
# 启动食品添加剂法规追踪平台
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "📦 检查并安装依赖..."
cd "$ROOT/api" && npm install --silent
cd "$ROOT/webapp" && npm install --silent

echo "🔨 构建前端..."
cd "$ROOT/webapp" && npm run build

echo "🚀 启动服务..."
cd "$ROOT/api" && node server.js &

echo ""
echo "✅ 服务已启动: http://localhost:3001"
echo "   按 Ctrl+C 停止"
wait
