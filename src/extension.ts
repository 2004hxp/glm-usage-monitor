import * as vscode from 'vscode';
import { PollingManager } from './PollingManager';
import { StatusBar } from './StatusBar';
import { WebViewProvider } from './WebViewProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('=================================');
  console.log('GLM Usage Monitor 插件已激活');
  console.log('=================================');

  // 立即显示一个通知，确认插件已加载
  vscode.window.showInformationMessage('🎉 GLM Usage Monitor 插件已激活！');

  // 检查配置
  const config = vscode.workspace.getConfiguration('glmUsageMonitor');
  const authToken = config.get<string>('authToken', '');

  console.log('API Token 配置状态:', authToken ? '已配置' : '未配置');

  if (!authToken) {
    // 首次使用，提示输入配置
    vscode.window.showWarningMessage(
      '⚠️ GLM Usage Monitor 需要配置 API Token 才能工作',
      '现在设置',
      '查看帮助'
    ).then(selection => {
      if (selection === '现在设置') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'glmUsageMonitor.authToken');
      } else if (selection === '查看帮助') {
        vscode.window.showInformationMessage(
          '请打开设置，搜索 "glmUsageMonitor.authToken"，然后输入您的 API Token'
        );
      }
    });
    console.log('插件已激活但未配置 API Token，退出');
    return;
  }

  console.log('开始创建管理器...');

  // 创建 StatusBar 和 WebViewProvider
  const statusBar = new StatusBar();
  const webViewProvider = new WebViewProvider(context);

  // 创建 PollingManager 并传入 statusBar 和 webViewProvider
  const pollingManager = new PollingManager(context, statusBar, webViewProvider);

  console.log('管理器创建完成，启动轮询...');

  // 启动轮询
  pollingManager.start();

  console.log('轮询已启动');

  // 注册命令
  const commands = [
    vscode.commands.registerCommand('glmUsageMonitor.showDetail', () => {
      console.log('命令被调用: showDetail');
      webViewProvider.show();
    }),
    vscode.commands.registerCommand('glmUsageMonitor.refresh', () => {
      console.log('命令被调用: refresh');
      pollingManager.poll();
    }),
    vscode.commands.registerCommand('glmUsageMonitor.start', () => {
      console.log('命令被调用: start');
      pollingManager.start();
      vscode.window.showInformationMessage('GLM 使用监控已启动');
    }),
    vscode.commands.registerCommand('glmUsageMonitor.stop', () => {
      console.log('命令被调用: stop');
      pollingManager.stop();
      vscode.window.showInformationMessage('GLM 使用监控已停止');
    })
  ];

  console.log('命令已注册:', commands.length, '个');

  // 监听配置变化
  const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('glmUsageMonitor.authToken')) {
      console.log('检测到 API Token 配置变化，重启轮询管理器');
      // API Token 变化，重启轮询管理器
      pollingManager.restart();
    }
  });

  // 添加到 disposables
  context.subscriptions.push(
    ...commands,
    configWatcher,
    pollingManager,
    statusBar,
    webViewProvider
  );

  console.log('=================================');
  console.log('GLM Usage Monitor 完全启动');
  console.log('=================================');

  vscode.window.showInformationMessage('✅ GLM Usage Monitor 已启动');
}

export function deactivate() {
  console.log('GLM Usage Monitor 插件已停用');
}
