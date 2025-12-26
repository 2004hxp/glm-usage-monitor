# Change Log

All notable changes to the "glm-usage-monitor" extension will be documented in this file.

## [1.0.0] - 2025-01-XX

### Initial Release

#### Features
- 实时监控 GLM Coding Plan 配额使用情况
- 自适应轮询机制（活跃 10 秒，空闲 30 秒）
- 状态栏实时显示配额使用率
- 详细的使用情况 WebView 面板
- 24 小时历史趋势图（柱状图）
- 历史记录表格（最近 50 条）
- 支持 Z.ai 和智谱平台
- 零依赖设计，使用 Node.js 原生模块

#### Configuration
- `glmUsageMonitor.authToken` - API Token 配置
- `glmUsageMonitor.baseUrl` - API 基础 URL（默认 Z.ai）
- `glmUsageMonitor.pollingInterval.active` - 活跃时轮询间隔
- `glmUsageMonitor.pollingInterval.idle` - 空闲时轮询间隔

#### Commands
- `glmUsageMonitor.showDetail` - 显示详情面板
- `glmUsageMonitor.refresh` - 立即刷新数据
- `glmUsageMonitor.start` - 开始监控
- `glmUsageMonitor.stop` - 停止监控
