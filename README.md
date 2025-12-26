# GLM Usage Monitor

监控 GLM Coding Plan 的使用情况和配额。

## 功能特性

- ✅ 实时监控 GLM 配额使用情况
- ✅ 自适应轮询（活跃 10 秒，空闲 30 秒）
- ✅ 状态栏实时显示
- ✅ 详细的使用情况面板
- ✅ 24 小时历史趋势图
- ✅ 支持 Z.ai 平台（默认）

## 安装

### 方式一：从源码安装

1. 克隆或下载本项目
2. 在项目目录下运行：
   ```bash
   npm install
   npm run compile
   ```
3. 按 `F5` 启动 VSCode Extension Development Host 进行测试

### 方式二：打包安装

1. 在项目目录下运行：
   ```bash
   npm install -g @vscode/vsce
   vsce package
   ```
2. 安装生成的 `.vsix` 文件：
   ```bash
   code --install-extension glm-usage-monitor-1.0.0.vsix
   ```

## 快速配置

只需一步：设置 API Token

### 获取 API Token

从您的环境变量中获取 `ANTHROPIC_AUTH_TOKEN` 的值。

### 配置步骤

1. 打开 VSCode 设置（`Ctrl+,` 或 `Cmd+,`）
2. 搜索 `glmUsageMonitor.authToken`
3. 将您的 API Token 粘贴到输入框中
4. 重新加载 VSCode

**就这么简单！** 插件会自动使用默认的 Z.ai 平台。

## 高级配置（可选）

如果需要使用智谱平台，可以修改 `glmUsageMonitor.baseUrl` 为：
```
https://open.bigmodel.cn/api/anthropic
```

## 使用

### 状态栏
- 右下角显示当前配额使用百分比
- 点击状态栏查看详情

### 命令面板
- `GLM Usage Monitor: 显示 GLM 使用详情` - 查看详细面板
- `GLM Usage Monitor: 刷新使用数据` - 立即刷新
- `GLM Usage Monitor: 开始/停止监控` - 控制监控

### 详情面板
- **平台信息**：当前使用的平台
- **配额使用**：Token 和 MCP 使用率进度条
- **历史趋势**：24 小时使用趋势图
- **历史记录**：详细的历史数据表格
- **详细数据**：完整的 API 响应 JSON

## 工作原理

1. 插件启动后自动开始轮询 GLM API
2. 活跃时每 10 秒查询一次，空闲时每 30 秒查询一次
3. 只有数据变化时才更新显示
4. 自动保存历史数据，提供趋势分析

## 常见问题

### Q: 提示 "API Token 无效"？
A: 请检查设置中的 API Token 是否正确，确保从 `ANTHROPIC_AUTH_TOKEN` 环境变量复制。

### Q: 如何切换到智谱平台？
A: 在设置中修改 `glmUsageMonitor.baseUrl` 为 `https://open.bigmodel.cn/api/anthropic`

### Q: 历史数据保存多久？
A: 内存中保存最近 24 小时的数据，最多 1440 条记录。

### Q: 如何禁用插件？
A: 在命令面板中选择 `GLM Usage Monitor: 停止监控`，或在 VSCode 设置中禁用插件。

## 项目结构

```
glm-usage-monitor/
├── src/
│   ├── extension.ts          # 主入口
│   ├── PollingManager.ts     # 轮询管理器 + 历史记录
│   ├── UsageService.ts       # 查询服务（复用现有逻辑）
│   ├── StatusBar.ts          # 状态栏
│   └── WebViewProvider.ts    # 详情面板 + 历史图表
├── package.json              # 插件配置
├── tsconfig.json             # TypeScript 配置
└── README.md                 # 文档
```

## 开发

### 编译
```bash
npm run compile
```

### 监听模式
```bash
npm run watch
```

### 调试
按 `F5` 启动 VSCode Extension Development Host

## 技术栈

- TypeScript
- VSCode Extension API
- Node.js native `https` module（零依赖）

## 许可证

Apache License 2.0

## 致谢

本项目基于 [zai-coding-plugins](https://github.com/zai-org/zai-coding-plugins) 的 `glm-plan-usage` 插件，将其查询逻辑封装为 VSCode 扩展。
