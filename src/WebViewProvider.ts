
import * as vscode from 'vscode';
import { UsageData } from './UsageService';
import { HistoryEntry } from './PollingManager';

export class WebViewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private currentHistory: HistoryEntry[] = [];

  constructor(private readonly _context: vscode.ExtensionContext) {}

  show() {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'glmUsageDetail',
      'GLM 使用情况',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
        enableCommandUris: false
      }
    );

    this.panel.webview.html = this.getWebviewContent();

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  update(usage: UsageData, history?: HistoryEntry[], nextTokenResetTime?: number | null): void {
    if (this.panel) {
      if (history) {
        this.currentHistory = history;
      }

      void this.panel.webview.postMessage({
        type: 'update',
        data: usage,
        history: this.currentHistory,
        nextTokenResetTime: nextTokenResetTime
      });
    }
  }

  private getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GLM 使用统计</title>
  <style>
    :root {
      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 16px;
      --space-lg: 24px;
      --space-xl: 32px;
      --radius-sm: 6px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-full: 9999px;
      --transition-fast: 0.15s;
      --transition-normal: 0.25s;
      --accent-primary: #6366f1;
      --accent-primary-light: #818cf8;
      --accent-secondary: #22d3ee;
      --color-success: #10b981;
      --color-success-light: rgba(16, 185, 129, 0.15);
      --color-warning: #f59e0b;
      --color-warning-light: rgba(245, 158, 11, 0.15);
      --color-error: #ef4444;
      --color-error-light: rgba(239, 68, 68, 0.15);
      --color-info: #3b82f6;
      --color-info-light: rgba(59, 130, 246, 0.15);
      --gradient-primary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
      --gradient-success: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      --gradient-warning: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
      --gradient-error: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
      --gradient-cool: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
      --glass-bg: rgba(255, 255, 255, 0.03);
      --glass-border: rgba(255, 255, 255, 0.08);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
      --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
      --shadow-glow: 0 0 40px rgba(99, 102, 241, 0.15);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: var(--space-lg);
      line-height: 1.6;
    }

    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 400px;
      background: linear-gradient(180deg, rgba(99, 102, 241, 0.03) 0%, transparent 100%);
      pointer-events: none;
      z-index: -1;
    }

    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: var(--radius-full); }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-xl);
      padding: var(--space-lg) var(--space-xl);
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      position: relative;
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: var(--gradient-primary);
    }

    .header-content { display: flex; align-items: center; gap: var(--space-md); }

    .header-icon {
      width: 48px; height: 48px;
      background: var(--gradient-primary);
      border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
      box-shadow: var(--shadow-glow);
    }

    .header-text h1 {
      font-size: 24px;
      font-weight: 700;
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header-text .subtitle { font-size: 13px; color: var(--vscode-descriptionForeground); margin-top: 2px; }

    .last-update {
      display: flex; align-items: center; gap: var(--space-sm);
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-editor-inactiveSelectionBackground);
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-full);
    }

    .last-update::before {
      content: '';
      width: 8px; height: 8px;
      background: var(--color-success);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    .update-info {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .token-reset {
      font-size: 11px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--radius-md);
      margin-top: var(--space-xs);
      font-weight: 500;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    .section {
      margin-bottom: var(--space-lg);
      padding: var(--space-lg);
      background: var(--glass-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      transition: all var(--transition-normal) ease;
      animation: fadeInUp 0.5s ease forwards;
      opacity: 0;
    }

    .section:nth-child(2) { animation-delay: 0.05s; }
    .section:nth-child(3) { animation-delay: 0.1s; }
    .section:nth-child(4) { animation-delay: 0.15s; }
    .section:nth-child(5) { animation-delay: 0.2s; }
    .section:nth-child(6) { animation-delay: 0.25s; }
    .section:nth-child(7) { animation-delay: 0.3s; }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .section:hover {
      box-shadow: var(--shadow-lg);
      border-color: rgba(99, 102, 241, 0.2);
      transform: translateY(-2px);
    }

    .section-title {
      font-size: 15px; font-weight: 600;
      margin-bottom: var(--space-md);
      display: flex; align-items: center; gap: var(--space-sm);
      padding-bottom: var(--space-md);
      border-bottom: 1px solid var(--glass-border);
    }

    .section-title-icon {
      width: 32px; height: 32px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }

    .section-title-icon.primary { background: var(--color-info-light); }
    .section-title-icon.success { background: var(--color-success-light); }
    .section-title-icon.warning { background: var(--color-warning-light); }
    .section-title-icon.purple { background: rgba(139, 92, 246, 0.15); }

    .section-subtitle {
      font-size: 14px; font-weight: 600;
      margin: var(--space-lg) 0 var(--space-md);
      color: var(--accent-primary);
      display: flex; align-items: center; gap: var(--space-sm);
    }

    .section-subtitle::before {
      content: '';
      width: 4px; height: 16px;
      background: var(--gradient-primary);
      border-radius: var(--radius-full);
    }

    .stats-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 14px; }
    .stats-table tr { transition: background-color var(--transition-fast) ease; }
    .stats-table tr:hover { background: var(--vscode-list-hoverBackground); }
    .stats-table td { padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--glass-border); }
    .stats-table tr:last-child td { border-bottom: none; }
    .stats-table td:first-child { font-weight: 500; color: var(--vscode-descriptionForeground); width: 40%; }
    .stats-table td:last-child { text-align: right; font-family: 'SF Mono', Monaco, monospace; font-weight: 600; font-size: 15px; }

    .highlight-list { list-style: none; display: flex; flex-direction: column; gap: var(--space-sm); }

    .highlight-item {
      padding: var(--space-md) var(--space-lg);
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%);
      border-radius: var(--radius-md);
      border-left: 4px solid var(--accent-primary);
      display: flex; align-items: center; gap: var(--space-md);
      transition: all var(--transition-normal) ease;
    }

    .highlight-item:hover { transform: translateX(4px); background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%); }

    .rank-badge {
      width: 28px; height: 28px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
    }

    .rank-badge.gold { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #1a1a1a; }
    .rank-badge.silver { background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%); color: white; }
    .rank-badge.bronze { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: white; }

    .highlight-content { flex: 1; }
    .highlight-content strong { color: var(--accent-primary-light); font-size: 14px; }
    .highlight-content .detail { font-size: 13px; color: var(--vscode-descriptionForeground); margin-top: 2px; }

    .highlight-value {
      font-family: 'SF Mono', Monaco, monospace;
      font-weight: 600; font-size: 14px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--radius-full);
    }

    .mcp-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg); }

    .mcp-summary-card {
      padding: var(--space-lg);
      background: linear-gradient(135deg, var(--glass-bg) 0%, rgba(99, 102, 241, 0.05) 100%);
      border-radius: var(--radius-md);
      text-align: center;
      border: 1px solid var(--glass-border);
      transition: all var(--transition-normal) ease;
      position: relative;
    }

    .mcp-summary-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: var(--gradient-cool);
      opacity: 0;
      transition: opacity var(--transition-normal) ease;
    }

    .mcp-summary-card:hover { border-color: var(--accent-secondary); transform: translateY(-4px); box-shadow: var(--shadow-lg); }
    .mcp-summary-card:hover::before { opacity: 1; }

    .mcp-label { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: var(--space-sm); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .mcp-value { font-size: 32px; font-weight: 300; font-family: 'SF Mono', Monaco, monospace; }
    .mcp-value.highlight { background: var(--gradient-cool); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 500; }

    .tool-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: var(--space-md) var(--space-lg);
      margin-bottom: var(--space-sm);
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      transition: all var(--transition-normal) ease;
      position: relative;
    }

    .tool-item::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 0;
      background: var(--gradient-primary);
      transition: width var(--transition-normal) ease;
    }

    .tool-item:hover { border-color: var(--accent-primary); transform: translateX(4px); }
    .tool-item:hover::before { width: 4px; }

    .tool-info { display: flex; align-items: center; gap: var(--space-md); z-index: 1; }

    .tool-icon {
      width: 36px; height: 36px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
    }

    .tool-details { display: flex; flex-direction: column; }
    .tool-name { font-weight: 600; font-size: 14px; }
    .tool-percentage { font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 2px; }

    .tool-count {
      font-family: 'SF Mono', Monaco, monospace;
      font-weight: 600; font-size: 13px;
      color: var(--accent-primary-light);
      padding: var(--space-xs) var(--space-md);
      background: rgba(99, 102, 241, 0.1);
      border-radius: var(--radius-full);
      z-index: 1;
    }

    .conclusion {
      padding: var(--space-lg);
      border-radius: var(--radius-md);
      border-left: 5px solid;
    }

    .conclusion.healthy { background: linear-gradient(135deg, var(--color-success-light) 0%, rgba(16, 185, 129, 0.05) 100%); border-left-color: var(--color-success); }
    .conclusion.warning { background: linear-gradient(135deg, var(--color-warning-light) 0%, rgba(245, 158, 11, 0.05) 100%); border-left-color: var(--color-warning); }
    .conclusion.error { background: linear-gradient(135deg, var(--color-error-light) 0%, rgba(239, 68, 68, 0.05) 100%); border-left-color: var(--color-error); }

    .conclusion-header { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-sm); }

    .conclusion-icon {
      width: 40px; height: 40px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; color: white;
    }

    .conclusion.healthy .conclusion-icon { background: var(--color-success); }
    .conclusion.warning .conclusion-icon { background: var(--color-warning); }
    .conclusion.error .conclusion-icon { background: var(--color-error); }

    .conclusion-title { font-size: 16px; font-weight: 700; }
    .conclusion-content { font-size: 14px; color: var(--vscode-descriptionForeground); margin-left: 56px; }

    .quota-detail-card {
      padding: var(--space-lg);
      margin-bottom: var(--space-md);
      background: linear-gradient(135deg, var(--glass-bg) 0%, rgba(99, 102, 241, 0.03) 100%);
      border-radius: var(--radius-lg);
      border: 1px solid var(--glass-border);
      transition: all var(--transition-normal) ease;
    }

    .quota-detail-card:hover { border-color: rgba(99, 102, 241, 0.3); box-shadow: var(--shadow-lg); }

    .quota-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md); }
    .quota-title-group { display: flex; align-items: center; gap: var(--space-md); }

    .quota-icon {
      width: 44px; height: 44px;
      border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      background: var(--gradient-primary);
      box-shadow: var(--shadow-glow);
    }

    .quota-title-text { display: flex; flex-direction: column; }
    .quota-title { font-size: 16px; font-weight: 700; }
    .quota-period { font-size: 12px; color: var(--vscode-descriptionForeground); }

    .quota-percentage { font-size: 28px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace; }
    .quota-percentage.normal { color: var(--color-success); }
    .quota-percentage.warning { color: var(--color-warning); }
    .quota-percentage.error { color: var(--color-error); }

    .progress-container { margin: var(--space-lg) 0; }

    .progress-track {
      height: 12px;
      background: var(--vscode-scrollbarSlider-background);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .progress-fill.normal { background: var(--gradient-success); }
    .progress-fill.warning { background: var(--gradient-warning); }
    .progress-fill.error { background: var(--gradient-error); }

    .progress-fill::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .quota-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-md);
      margin-top: var(--space-lg);
      padding-top: var(--space-lg);
      border-top: 1px solid var(--glass-border);
    }

    .quota-stat { text-align: center; }
    .quota-stat-label { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: var(--space-xs); text-transform: uppercase; }
    .quota-stat-value { font-size: 14px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace; }

    .chart-container { padding: var(--space-md); background: var(--vscode-editor-background); border-radius: var(--radius-md); }

    .chart-tabs {
      display: flex; gap: 2px;
      margin-bottom: var(--space-lg);
      background: var(--vscode-editor-inactiveSelectionBackground);
      padding: 4px;
      border-radius: var(--radius-md);
      width: fit-content;
    }

    .chart-tab {
      padding: var(--space-sm) var(--space-md);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 13px; font-weight: 500;
      color: var(--vscode-descriptionForeground);
      transition: all var(--transition-fast) ease;
    }

    .chart-tab:hover { color: var(--vscode-foreground); }
    .chart-tab.active { background: var(--gradient-primary); color: white; }

    .chart-legend {
      display: flex; justify-content: center; gap: var(--space-xl);
      margin-top: var(--space-lg);
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    .legend-item { display: flex; align-items: center; gap: var(--space-sm); }
    .legend-color { width: 12px; height: 12px; border-radius: 50%; }

    .empty-state { text-align: center; padding: 40px; color: var(--vscode-descriptionForeground); font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <div class="header-icon">📊</div>
      <div class="header-text">
        <h1>GLM Coding Plan</h1>
        <p class="subtitle">使用情况监控面板</p>
      </div>
    </div>
    <div class="update-info">
      <p class="last-update" id="lastUpdate">等待数据...</p>
      <p class="token-reset" id="tokenReset" style="display: none;"></p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">
      <span class="section-title-icon primary">📈</span>
      核心数据概览
    </div>
    <table class="stats-table">
      <tbody>
        <tr><td>总调用次数</td><td id="totalCalls">-</td></tr>
        <tr><td>总 Token 使用量</td><td id="totalTokens">-</td></tr>
        <tr><td>Token 配额 (5h窗口)</td><td id="tokenQuota">-</td></tr>
        <tr><td>MCP 配额 (1个月)</td><td id="mcpQuota">-</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">
      <span class="section-title-icon primary">📊</span>
      配额使用详情
    </div>
    <div id="quotaList"></div>
  </div>

  <div class="section">
    <div class="section-title">
      <span class="section-title-icon warning">⚡</span>
      最近活跃时段
    </div>
    <ul class="highlight-list" id="activePeriods">
      <li class="highlight-item">
        <div class="rank-badge gold">-</div>
        <div class="highlight-content"><strong>等待数据...</strong></div>
      </li>
    </ul>
  </div>

  <div class="section">
    <div class="section-title">
      <span class="section-title-icon purple">🔧</span>
      MCP 工具使用明细（1个月周期）
    </div>
    <div class="mcp-summary">
      <div class="mcp-summary-card">
        <div class="mcp-label">总使用次数</div>
        <div class="mcp-value" id="mcpTotalUsage">-</div>
      </div>
      <div class="mcp-summary-card">
        <div class="mcp-label">剩余配额</div>
        <div class="mcp-value" id="mcpRemaining">-</div>
      </div>
      <div class="mcp-summary-card">
        <div class="mcp-label">使用率</div>
        <div class="mcp-value highlight" id="mcpUsageRate">-</div>
      </div>
    </div>
    <div class="section-subtitle">工具详细使用情况</div>
    <div id="mcpToolsList"></div>
  </div>

  <div class="section">
    <div class="section-title">
      <span class="section-title-icon success">✅</span>
      健康状态评估
    </div>
    <div class="conclusion healthy" id="healthConclusion">
      <div class="conclusion-header">
        <div class="conclusion-icon">✓</div>
        <div class="conclusion-title">等待数据...</div>
      </div>
      <div class="conclusion-content">请等待数据更新</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">
      <span class="section-title-icon purple">📈</span>
      Token 使用趋势（最近 24 小时）
    </div>
    <div class="chart-tabs">
      <button class="chart-tab active" data-type="tokens">Token 使用量</button>
      <button class="chart-tab" data-type="calls">调用次数</button>
    </div>
    <div class="chart-container">
      <canvas id="tokenChart" style="max-height: 250px; width: 100%;"></canvas>
    </div>
    <div class="chart-legend" id="chartLegend"></div>
  </div>

  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register = function() {
        return Promise.reject(new Error('Service Worker is not allowed'));
      };
    }

    const vscode = acquireVsCodeApi();
    let currentData = null;
    let currentHistory = [];
    let nextTokenResetTime = null;
    let resetTimer = null;

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'update') {
        currentData = message.data;
        currentHistory = message.history || [];
        nextTokenResetTime = message.nextTokenResetTime || null;
        updateUI();
        updateTokenResetInfo();
        startResetTimer();
      }
    });

    function updateUI() {
      if (!currentData) return;

      const date = new Date(currentData.timestamp);
      document.getElementById('lastUpdate').textContent = date.toLocaleString('zh-CN');

      updateCoreStats();
      updateActivePeriods();
      updateMCPTools();
      updateHealthConclusion();
      updateQuotaDetails();
      updateCharts();
    }

    function updateTokenResetInfo() {
      const tokenResetEl = document.getElementById('tokenReset');
      if (!nextTokenResetTime || !tokenResetEl) {
        if (tokenResetEl) {
          tokenResetEl.style.display = 'none';
        }
        return;
      }

      tokenResetEl.style.display = 'block';
      updateTokenResetCountdown();
    }

    function updateTokenResetCountdown() {
      const tokenResetEl = document.getElementById('tokenReset');
      if (!nextTokenResetTime || !tokenResetEl) return;

      const now = Date.now();
      const remaining = Math.max(0, nextTokenResetTime - now);

      if (remaining <= 0) {
        tokenResetEl.textContent = '🔄 Token 已重置';
        tokenResetEl.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
        return;
      }

      const remainingHours = Math.floor(remaining / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const remainingSeconds = Math.floor((remaining % (1000 * 60)) / 1000);

      const timeStr = new Date(nextTokenResetTime).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      let text = '🔁 Token 重置: ';
      if (remainingHours > 0) {
        text += remainingHours + '小时' + remainingMinutes + '分' + remainingSeconds + '秒';
      } else if (remainingMinutes > 0) {
        text += remainingMinutes + '分' + remainingSeconds + '秒';
      } else {
        text += remainingSeconds + '秒';
      }
      text += ' 后 (' + timeStr + ')';

      tokenResetEl.textContent = text;
      tokenResetEl.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    function startResetTimer() {
      if (resetTimer) {
        clearInterval(resetTimer);
      }

      if (!nextTokenResetTime) {
        return;
      }

      resetTimer = setInterval(() => {
        updateTokenResetCountdown();

        const now = Date.now();
        if (nextTokenResetTime && now >= nextTokenResetTime) {
          clearInterval(resetTimer);
        }
      }, 1000);
    }

    function updateCoreStats() {
      let totalCalls = 0, totalTokens = 0;

      if (currentData.modelUsage && currentData.modelUsage.totalUsage) {
        totalCalls = currentData.modelUsage.totalUsage.totalModelCallCount || 0;
        totalTokens = currentData.modelUsage.totalUsage.totalTokensUsage || 0;
      }

      document.getElementById('totalCalls').textContent = totalCalls.toLocaleString() + ' 次';
      document.getElementById('totalTokens').textContent = totalTokens.toLocaleString() + ' 个';

      if (currentData.quotaLimit && currentData.quotaLimit.limits) {
        const tokenLimit = currentData.quotaLimit.limits.find(l => l.type.includes('Token'));
        const mcpLimit = currentData.quotaLimit.limits.find(l => l.type.includes('MCP'));

        if (tokenLimit) {
          document.getElementById('tokenQuota').textContent = '已使用 ' + tokenLimit.percentage + '%';
        }
        if (mcpLimit) {
          const mcpText = '已使用 ' + mcpLimit.percentage + '%';
          document.getElementById('mcpQuota').textContent = mcpLimit.currentUsage && mcpLimit.total
            ? mcpText + ' (' + mcpLimit.currentUsage + '/' + mcpLimit.total + ' 次)'
            : mcpText;
        }
      }
    }

    function updateActivePeriods() {
      const container = document.getElementById('activePeriods');
      container.innerHTML = '';

      if (!currentData.modelUsage || !currentData.modelUsage.x_time) {
        container.innerHTML = '<li class="highlight-item"><div class="rank-badge gold">-</div><div class="highlight-content"><strong>暂无数据</strong></div></li>';
        return;
      }

      const times = currentData.modelUsage.x_time;
      const tokenUsage = currentData.modelUsage.tokensUsage || [];
      const callCounts = currentData.modelUsage.modelCallCount || [];

      const periods = times.map((time, index) => ({
        time, tokens: tokenUsage[index] || 0, calls: callCounts[index] || 0
      })).filter(p => p.tokens > 0).sort((a, b) => b.tokens - a.tokens).slice(0, 3);

      if (periods.length === 0) {
        container.innerHTML = '<li class="highlight-item"><div class="rank-badge gold">-</div><div class="highlight-content"><strong>暂无活跃时段</strong></div></li>';
        return;
      }

      const labels = ['高峰期', '次高峰', '第三'];
      const badges = ['gold', 'silver', 'bronze'];

      periods.forEach((period, index) => {
        const li = document.createElement('li');
        li.className = 'highlight-item';
        li.innerHTML = '          <div class="rank-badge ' + badges[index] + '">' + (index + 1) + '</div>\\n          <div class="highlight-content">\\n            <strong>' + labels[index] + '</strong>\\n            <div class="detail">' + period.time + '</div>\\n          </div>\\n          <div class="highlight-value">' + period.tokens.toLocaleString() + ' tokens</div>        ';
        container.appendChild(li);
      });
    }

    function updateMCPTools() {
      const container = document.getElementById('mcpToolsList');
      container.innerHTML = '';

      if (!currentData.quotaLimit || !currentData.quotaLimit.limits) {
        container.innerHTML = '<div class="empty-state">暂无 MCP 配额数据</div>';
        return;
      }

      const mcpLimit = currentData.quotaLimit.limits.find(l => l.type.includes('MCP'));
      if (!mcpLimit) {
        container.innerHTML = '<div class="empty-state">未找到 MCP 配额信息</div>';
        return;
      }

      const currentUsage = mcpLimit.currentUsage || 0;
      const total = mcpLimit.total || 1000;
      const remaining = total - currentUsage;
      const percentage = mcpLimit.percentage || 0;

      document.getElementById('mcpTotalUsage').textContent = currentUsage + ' 次';
      document.getElementById('mcpRemaining').textContent = remaining + ' 次';
      document.getElementById('mcpUsageRate').textContent = percentage + '%';

      const tools = [];
      const toolNameMap = {
        'search-prime': ['🔍', '搜索（search-prime）'],
        'web-reader': ['📖', '网页阅读'],
        'zread': ['📚', '代码阅读'],
        'search': ['🔎', '搜索']
      };

      if (mcpLimit.usageDetails && Array.isArray(mcpLimit.usageDetails)) {
        mcpLimit.usageDetails.forEach(item => {
          const code = item.modelCode || 'unknown';
          const [icon, name] = toolNameMap[code] || ['🔧', code];
          tools.push({
            icon, name, count: item.usage || 0,
            percentage: currentUsage > 0 ? ((item.usage || 0) / currentUsage * 100).toFixed(1) : '0.0'
          });
        });
      }

      if (tools.length === 0 && currentData.toolUsage && currentData.toolUsage.totalUsage) {
        const tu = currentData.toolUsage.totalUsage;
        if (tu.totalNetworkSearchCount > 0) tools.push({ icon: '🔍', name: '搜索', count: tu.totalNetworkSearchCount, percentage: (tu.totalNetworkSearchCount / currentUsage * 100).toFixed(1) });
        if (tu.totalWebReadMcpCount > 0) tools.push({ icon: '📖', name: '网页阅读', count: tu.totalWebReadMcpCount, percentage: (tu.totalWebReadMcpCount / currentUsage * 100).toFixed(1) });
        if (tu.totalZreadMcpCount > 0) tools.push({ icon: '📚', name: '代码阅读', count: tu.totalZreadMcpCount, percentage: (tu.totalZreadMcpCount / currentUsage * 100).toFixed(1) });
      }

      if (tools.length === 0) {
        [['🔍', '搜索'], ['📖', '网页阅读'], ['📚', '代码阅读']].forEach(([icon, name]) => {
          tools.push({ icon, name, count: 0, percentage: '0.0' });
        });
      }

      tools.forEach(tool => {
        const div = document.createElement('div');
        div.className = 'tool-item';
        div.innerHTML = '          <div class="tool-info">\\n            <div class="tool-icon">' + tool.icon + '</div>\\n            <div class="tool-details">\\n              <div class="tool-name">' + tool.name + '</div>\\n              <div class="tool-percentage">占比 ' + tool.percentage + '%</div>\\n            </div>\\n          </div>\\n          <span class="tool-count">' + tool.count + ' 次</span>        ';
        container.appendChild(div);
      });
    }

    function updateHealthConclusion() {
      const container = document.getElementById('healthConclusion');

      if (!currentData.quotaLimit || !currentData.quotaLimit.limits) {
        container.className = 'conclusion warning';
        container.querySelector('.conclusion-icon').textContent = '⚠';
        container.querySelector('.conclusion-title').textContent = '数据不足';
        container.querySelector('.conclusion-content').textContent = '无法评估健康状态';
        return;
      }

      const tokenLimit = currentData.quotaLimit.limits.find(l => l.type.includes('Token'));
      const mcpLimit = currentData.quotaLimit.limits.find(l => l.type.includes('MCP'));
      const tokenPercent = tokenLimit ? tokenLimit.percentage : 0;
      const mcpPercent = mcpLimit ? mcpLimit.percentage : 0;

      let status, icon, title, content;

      if (tokenPercent >= 90 || mcpPercent >= 90) {
        status = 'error'; icon = '✕'; title = '配额紧张';
        content = '至少一个维度的配额使用率超过 90%，建议立即关注使用情况';
      } else if (tokenPercent >= 70 || mcpPercent >= 70) {
        status = 'warning'; icon = '!'; title = '配额偏高';
        content = '至少一个维度的配额使用率超过 70%，建议关注使用趋势';
      } else {
        status = 'healthy'; icon = '✓'; title = '配额健康';
        content = '所有配额都处于正常水平，可以继续正常使用服务';
      }

      container.className = 'conclusion ' + status;
      container.querySelector('.conclusion-icon').textContent = icon;
      container.querySelector('.conclusion-title').textContent = title;
      container.querySelector('.conclusion-content').textContent = content;
    }

    function updateQuotaDetails() {
      const container = document.getElementById('quotaList');
      container.innerHTML = '';

      if (!currentData.quotaLimit || !currentData.quotaLimit.limits) {
        container.innerHTML = '<div class="empty-state">暂无数据</div>';
        return;
      }

      currentData.quotaLimit.limits.forEach(limit => {
        const percentage = limit.percentage || 0;
        const statusClass = percentage >= 90 ? 'error' : percentage >= 70 ? 'warning' : 'normal';
        const icon = limit.type.includes('Token') ? '🎯' : '🔧';
        const period = limit.type.includes('Token') ? '5小时窗口' : '1个月周期';

        let currentUsage = '-', totalLimit = '-', remaining = '-', statusText = '正常';

        if (limit.type.includes('Token')) {
          if (currentData.modelUsage && currentData.modelUsage.totalUsage) {
            currentUsage = (currentData.modelUsage.totalUsage.totalTokensUsage || 0).toLocaleString() + ' tokens';
          }
          totalLimit = '滚动窗口';
          remaining = (100 - percentage) + '%';
          statusText = percentage >= 90 ? '接近上限' : percentage >= 70 ? '使用偏高' : '充足';
        } else {
          currentUsage = (limit.currentUsage || 0) + ' 次';
          totalLimit = (limit.total || 1000) + ' 次';
          remaining = ((limit.total || 1000) - (limit.currentUsage || 0)) + ' 次';
          statusText = percentage >= 90 ? '接近上限' : percentage >= 70 ? '使用偏高' : '充足';
        }

        const card = document.createElement('div');
        card.className = 'quota-detail-card';
        card.innerHTML = '          <div class="quota-header">\\n            <div class="quota-title-group">\\n              <div class="quota-icon">' + icon + '</div>\\n              <div class="quota-title-text">\\n                <div class="quota-title">' + limit.type + '</div>\\n                <div class="quota-period">' + period + '</div>\\n              </div>\\n            </div>\\n            <div class="quota-percentage ' + statusClass + '">' + percentage + '%</div>\\n          </div>\\n          <div class="progress-container">\\n            <div class="progress-track">\\n              <div class="progress-fill ' + statusClass + '" style="width: ' + percentage + '%"></div>\\n            </div>\\n          </div>\\n          <div class="quota-stats">\\n            <div class="quota-stat">\\n              <div class="quota-stat-label">已使用</div>\\n              <div class="quota-stat-value">' + currentUsage + '</div>\\n            </div>\\n            <div class="quota-stat">\\n              <div class="quota-stat-label">总量</div>\\n              <div class="quota-stat-value">' + totalLimit + '</div>\\n            </div>\\n            <div class="quota-stat">\\n              <div class="quota-stat-label">剩余</div>\\n              <div class="quota-stat-value">' + remaining + '</div>\\n            </div>\\n            <div class="quota-stat">\\n              <div class="quota-stat-label">状态</div>\\n              <div class="quota-stat-value" style="color: var(--color-' + (statusClass === 'normal' ? 'success' : statusClass) + ')">' + statusText + '</div>\\n            </div>\\n          </div>        ';
        container.appendChild(card);
      });
    }

    let currentChartType = 'tokens';
    let chartData = { tokens: [], calls: [], labels: [] };

    function updateCharts() {
      const canvas = document.getElementById('tokenChart');
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;

      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!currentData.modelUsage || !currentData.modelUsage.x_time) {
        ctx.font = '14px -apple-system, sans-serif';
        ctx.fillStyle = 'var(--vscode-descriptionForeground)';
        ctx.textAlign = 'center';
        ctx.fillText('暂无使用数据', rect.width / 2, rect.height / 2);
        return;
      }

      chartData.labels = currentData.modelUsage.x_time;
      chartData.tokens = (currentData.modelUsage.tokensUsage || []).map(v => v || 0);
      chartData.calls = (currentData.modelUsage.modelCallCount || []).map(v => v || 0);

      drawChart(ctx, rect.width, rect.height);
    }

    function drawChart(ctx, width, height) {
      const dataPoints = currentChartType === 'tokens' ? chartData.tokens : chartData.calls;
      const validData = dataPoints.map((value, index) => ({ value, index })).filter(item => item.value != null);

      if (validData.length === 0) {
        ctx.font = '14px -apple-system, sans-serif';
        ctx.fillStyle = 'var(--vscode-descriptionForeground)';
        ctx.textAlign = 'center';
        ctx.fillText('暂无有效数据', width / 2, height / 2);
        return;
      }

      const padding = { top: 30, right: 30, bottom: 40, left: 50 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      const max = Math.max(...validData.map(d => d.value)) || 1;

      // 网格线
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([5, 5]);
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        ctx.fillStyle = 'var(--vscode-descriptionForeground)';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(formatNumber(max - (max / 5) * i), padding.left - 10, y + 4);
      }
      ctx.setLineDash([]);

      // 渐变填充
      const lineColor = currentChartType === 'tokens' ? '#6366f1' : '#ef4444';
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, currentChartType === 'tokens' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(239, 68, 68, 0.3)');
      gradient.addColorStop(1, 'transparent');

      // 绘制折线
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      validData.forEach((item, i) => {
        const x = padding.left + (item.index / (dataPoints.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (item.value / max) * chartHeight;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 填充区域
      const lastItem = validData[validData.length - 1];
      ctx.lineTo(padding.left + (lastItem.index / (dataPoints.length - 1)) * chartWidth, padding.top + chartHeight);
      ctx.lineTo(padding.left + (validData[0].index / (dataPoints.length - 1)) * chartWidth, padding.top + chartHeight);
      ctx.fillStyle = gradient;
      ctx.fill();

      // 数据点
      validData.forEach(item => {
        const x = padding.left + (item.index / (dataPoints.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (item.value / max) * chartHeight;

        ctx.fillStyle = 'var(--vscode-editor-background)';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // X轴标签
      ctx.fillStyle = 'var(--vscode-descriptionForeground)';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const labelInterval = Math.ceil(dataPoints.length / 8);
      dataPoints.forEach((_, index) => {
        if (index % labelInterval === 0) {
          const x = padding.left + (index / (dataPoints.length - 1)) * chartWidth;
          const label = chartData.labels[index] || '';
          ctx.fillText(label.split(' ').pop().substring(0, 5), x, height - padding.bottom + 20);
        }
      });

      updateLegend();
    }

    function formatNumber(num) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    }

    function updateLegend() {
      const data = currentChartType === 'tokens' ? chartData.tokens : chartData.calls;
      const validData = data.filter(v => v != null);
      const sum = validData.reduce((a, b) => a + b, 0);
      const avg = validData.length > 0 ? Math.round(sum / validData.length) : 0;
      const max = Math.max(...validData, 0);
      const unit = currentChartType === 'tokens' ? 'tokens' : '次';
      const color = currentChartType === 'tokens' ? '#6366f1' : '#ef4444';

      document.getElementById('chartLegend').innerHTML = '        <div class="legend-item"><div class="legend-color" style="background:' + color + '"></div><span>总计: ' + formatNumber(sum) + ' ' + unit + '</span></div>\\n        <div class="legend-item"><div class="legend-color" style="background:' + color + '"></div><span>平均: ' + formatNumber(avg) + ' ' + unit + '/h</span></div>\\n        <div class="legend-item"><div class="legend-color" style="background:' + color + '"></div><span>峰值: ' + formatNumber(max) + ' ' + unit + '</span></div>      ';
    }

    document.querySelectorAll('.chart-tab').forEach(tab => {
      tab.addEventListener('click', e => {
        if (!currentData) return;
        document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentChartType = e.target.getAttribute('data-type');
        updateCharts();
      });
    });

    window.addEventListener('resize', () => currentData && updateCharts());
  </script>
</body>
</html>
`;
  }

  dispose() {
    if (this.panel) {
      this.panel.dispose();
    }
  }
}