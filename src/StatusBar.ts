import * as vscode from 'vscode';
import { UsageData } from './UsageService';

export class StatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.statusBarItem.command = 'glmUsageMonitor.showDetail';
    this.statusBarItem.text = '$(database) GLM: 初始化中...';
    this.statusBarItem.tooltip = 'GLM Usage Monitor - 正在获取数据...';
    this.statusBarItem.show();
  }

  update(usage: UsageData, nextTokenResetTime?: number | null) {
    console.log('[StatusBar] update 被调用');
    console.log('[StatusBar] quotaLimit:', JSON.stringify(usage.quotaLimit, null, 2));

    // 提取配额信息
    const quotaInfo = this.extractQuotaInfo(usage.quotaLimit);
    console.log('[StatusBar] quotaInfo:', quotaInfo);

    // 构建显示文本
    let text = '$(database) ';

    if (usage.platform === 'ZHIPU') {
      text += '智谱';
    } else {
      text += 'GLM';
    }

    text += ': ';

    if (quotaInfo) {
      text += `${quotaInfo.percentage}%`;
    } else {
      text += '未获取到配额';
    }

    console.log('[StatusBar] 设置文本:', text);
    this.statusBarItem.text = text;

    // 设置 tooltip
    this.statusBarItem.tooltip = this.buildTooltip(usage, nextTokenResetTime);

    // 根据使用率设置颜色
    if (quotaInfo && quotaInfo.percentage >= 90) {
      this.statusBarItem.color = new vscode.ThemeColor('errorForeground');
    } else if (quotaInfo && quotaInfo.percentage >= 70) {
      this.statusBarItem.color = new vscode.ThemeColor('warningForeground');
    } else {
      this.statusBarItem.color = undefined;
    }

    console.log('[StatusBar] 更新完成');
  }

  showError(errorMessage: string) {
    this.statusBarItem.text = '$(error) GLM: 错误';
    this.statusBarItem.tooltip = `错误: ${errorMessage}\n点击查看详情`;
    this.statusBarItem.color = new vscode.ThemeColor('errorForeground');
  }

  private extractQuotaInfo(quotaLimit: any): { percentage: number } | null {
    if (!quotaLimit || !quotaLimit.limits || !Array.isArray(quotaLimit.limits)) {
      return null;
    }

    // 找到 TOKENS_LIMIT 类型的配额
    const tokenLimit = quotaLimit.limits.find((item: any) =>
      item.type.includes('Token')
    );

    if (tokenLimit) {
      return {
        percentage: tokenLimit.percentage || 0
      };
    }

    return null;
  }

  private buildTooltip(usage: UsageData, nextTokenResetTime?: number | null): string {
    let tooltip = 'GLM Coding Plan 使用情况\n\n';

    tooltip += `平台: ${usage.platform}\n`;

    if (usage.quotaLimit && usage.quotaLimit.limits) {
      tooltip += '\n配额详情:\n';
      usage.quotaLimit.limits.forEach((limit: any) => {
        tooltip += `  • ${limit.type}: ${limit.percentage}%\n`;
      });
    }

    // 添加 Token 重置时间
    if (nextTokenResetTime) {
      const now = Date.now();
      const remaining = Math.max(0, nextTokenResetTime - now);
      const remainingHours = Math.floor(remaining / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      tooltip += '\n\nToken 重置信息:\n';
      tooltip += `  • 下次重置: ${remainingHours}小时${remainingMinutes}分钟后\n`;
      tooltip += `  • 重置时间: ${new Date(nextTokenResetTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}\n`;
      tooltip += `  • 窗口: 5小时滚动窗口`;
    }

    tooltip += '\n\n点击查看详情';

    return tooltip;
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}
