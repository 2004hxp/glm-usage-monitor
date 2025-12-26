import * as vscode from 'vscode';
import { UsageService, UsageData } from './UsageService';
import { StatusBar } from './StatusBar';
import { WebViewProvider } from './WebViewProvider';

export interface HistoryEntry {
  data: UsageData;
  timestamp: number;
}

export class PollingManager {
  private timer: NodeJS.Timeout | undefined;
  private pollingInterval: number = 10000;
  private userActivityTime: number = Date.now();
  private lastUsage: UsageData | null = null;
  private usageService: UsageService;
  private isRunning: boolean = false;
  private nextTokenResetTime: number | null = null;

  // 历史数据
  private history: HistoryEntry[] = [];
  private readonly MAX_HISTORY_SIZE = 1440;

  // 默认配置
  private readonly DEFAULT_BASE_URL = 'https://api.z.ai/api/anthropic';
  private readonly ACTIVE_INTERVAL = 10000;
  private readonly IDLE_INTERVAL = 30000;
  private readonly IDLE_THRESHOLD = 60000;

  constructor(
    private context: vscode.ExtensionContext,
    private statusBar?: StatusBar,
    private webViewProvider?: WebViewProvider
  ) {
    this.usageService = this.createUsageService();
    this.monitorUserActivity();
    this.loadHistory();
  }

  private createUsageService(): UsageService {
    const config = vscode.workspace.getConfiguration('glmUsageMonitor');
    const authToken = config.get<string>('authToken', '');

    if (!authToken) {
      throw new Error('API Token 未配置');
    }

    // 使用默认 Base URL
    return new UsageService(authToken, this.DEFAULT_BASE_URL);
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.scheduleNextPoll();
    console.log('轮询管理器已启动');
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.isRunning = false;
    console.log('轮询管理器已停止');
  }

  restart() {
    this.stop();
    this.usageService = this.createUsageService();
    this.start();
  }

  private scheduleNextPoll() {
    if (!this.isRunning) {
      return;
    }

    this.adjustInterval();

    this.timer = setTimeout(() => {
      this.poll();
      this.scheduleNextPoll();
    }, this.pollingInterval);
  }

  async poll() {
    if (!this.isRunning) {
      return;
    }

    console.log('[' + new Date().toLocaleTimeString() + '] 开始轮询...');

    try {
      const currentUsage = await this.usageService.getUsage();

      console.log('API 返回数据:', JSON.stringify(currentUsage, null, 2));

      const changed = this.hasChanged(currentUsage);
      console.log('数据是否变化:', changed);

      if (changed) {
        console.log('数据已变化，更新 UI...');
        this.addToHistory(currentUsage);
        this.calculateNextTokenReset(currentUsage);

        if (this.statusBar) {
          console.log('更新状态栏...');
          this.statusBar.update(currentUsage, this.nextTokenResetTime);
        }
        if (this.webViewProvider) {
          this.webViewProvider.update(currentUsage, this.getHistory(24), this.nextTokenResetTime);
        }
        console.log('UI 更新完成');
      } else {
        console.log('数据未变化，跳过更新');
      }

      this.lastUsage = currentUsage;

    } catch (error) {
      console.error('轮询失败:', error);

      // 检查错误类型
      if (error instanceof Error) {
        console.error('错误详情:', error.message);

        // 更新状态栏显示错误
        if (this.statusBar) {
          this.statusBar.showError(error.message);
        }

        if (error.message.includes('401') || error.message.includes('403')) {
          vscode.window.showErrorMessage(
            'API Token 无效，请检查设置',
            '打开设置'
          ).then(selection => {
            if (selection === '打开设置') {
              vscode.commands.executeCommand(
                'workbench.action.openSettings',
                'glmUsageMonitor.authToken'
              );
            }
          });
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          // 网络错误，只显示在状态栏，不弹窗
          console.warn('网络连接失败，将在下次轮询重试');
        }
      }
    }
  }

  private hasChanged(currentUsage: UsageData): boolean {
    if (!this.lastUsage) {
      return true;
    }

    return (
      currentUsage.timestamp !== this.lastUsage.timestamp ||
      JSON.stringify(currentUsage.quotaLimit) !== JSON.stringify(this.lastUsage.quotaLimit)
    );
  }

  private addToHistory(usage: UsageData) {
    const entry: HistoryEntry = {
      data: usage,
      timestamp: Date.now()
    };

    this.history.push(entry);

    if (this.history.length > this.MAX_HISTORY_SIZE) {
      this.history.shift();
    }

    if (this.history.length % 10 === 0) {
      this.saveHistory();
    }
  }

  getHistory(hours: number = 24): HistoryEntry[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.history.filter(entry => entry.timestamp > cutoff);
  }

  getAllHistory(): HistoryEntry[] {
    return [...this.history];
  }

  private saveHistory() {
    const recentHistory = this.history.slice(-100);
    this.context.globalState.update('usageHistory', recentHistory);
  }

  private loadHistory() {
    const saved = this.context.globalState.get<HistoryEntry[]>('usageHistory', []);
    this.history = saved;
  }

  clearHistory() {
    this.history = [];
    this.context.globalState.update('usageHistory', []);
  }

  // 计算下一次 Token 重置时间（5小时窗口）
  private calculateNextTokenReset(usage: UsageData) {
    if (!usage.quotaLimit || !usage.quotaLimit.limits) {
      this.nextTokenResetTime = null;
      return;
    }

    const tokenLimit = usage.quotaLimit.limits.find((limit: any) =>
      limit.type.includes('Token') || limit.type === 'TOKENS_LIMIT'
    );

    if (!tokenLimit) {
      this.nextTokenResetTime = null;
      return;
    }

    // Token 使用量是5小时窗口，计算下一次重置时间
    const now = new Date(usage.timestamp);
    const currentHour = now.getHours();

    // 找到当前5小时窗口的起始小时（0, 5, 10, 15, 20）
    const windowStartHour = Math.floor(currentHour / 5) * 5;

    // 下一次重置时间是当前窗口开始 + 5小时
    const nextReset = new Date(now);
    nextReset.setHours(windowStartHour + 5, 0, 0, 0);

    // 如果计算出的重置时间已经过了，说明跨天了，需要加一天
    if (nextReset.getTime() <= now.getTime()) {
      nextReset.setDate(nextReset.getDate() + 1);
    }

    this.nextTokenResetTime = nextReset.getTime();
  }

  // 获取下一次 Token 重置时间
  getNextTokenResetTime(): number | null {
    return this.nextTokenResetTime;
  }

  private adjustInterval() {
    const timeSinceLastActivity = Date.now() - this.userActivityTime;

    if (timeSinceLastActivity > this.IDLE_THRESHOLD) {
      this.pollingInterval = this.IDLE_INTERVAL;
    } else {
      this.pollingInterval = this.ACTIVE_INTERVAL;
    }
  }

  private monitorUserActivity() {
    const events = [
      vscode.window.onDidChangeActiveTextEditor,
      vscode.window.onDidChangeTextEditorSelection,
      vscode.window.onDidChangeTextEditorVisibleRanges
    ];

    events.forEach(handler => {
      handler(() => {
        this.userActivityTime = Date.now();
      });
    });
  }

  dispose() {
    this.stop();
    this.saveHistory();
  }
}
