import * as https from 'https';
import * as http from 'http';

export interface UsageData {
  platform: string;
  modelUsage: any;
  toolUsage: any;
  quotaLimit: any;
  timestamp: number;
}

export class UsageService {
  private authToken: string;
  private baseUrl: string;
  private platform: string;
  private httpsAgent: https.Agent;
  private httpAgent: http.Agent;

  constructor(authToken: string, baseUrl: string) {
    this.authToken = authToken;
    this.baseUrl = baseUrl;
    this.platform = this.detectPlatform(baseUrl);

    // 创建支持代理的 Agent
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false, // 允许自签名证书
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 10,
      maxFreeSockets: 5,
      timeout: 30000,
      scheduling: 'fifo'
    });

    this.httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 10,
      maxFreeSockets: 5,
      timeout: 30000
    });
  }

  private detectPlatform(baseUrl: string): string {
    if (baseUrl.includes('api.z.ai')) {
      return 'ZAI';
    } else if (baseUrl.includes('bigmodel.cn')) {
      return 'ZHIPU';
    }
    return 'ZAI';
  }

  async getUsage(): Promise<UsageData> {
    const baseDomain = this.getBaseDomain();

    const timeWindow = this.getTimeWindow();
    const queryParams = `?startTime=${encodeURIComponent(timeWindow.startTime)}&endTime=${encodeURIComponent(timeWindow.endTime)}`;

    const modelUsageUrl = `${baseDomain}/api/monitor/usage/model-usage`;
    const toolUsageUrl = `${baseDomain}/api/monitor/usage/tool-usage`;
    const quotaLimitUrl = `${baseDomain}/api/monitor/usage/quota/limit`;

    // 并行请求三个端点（复用现有逻辑）
    const [modelUsage, toolUsage, quotaLimit] = await Promise.all([
      this.queryAPI(modelUsageUrl + queryParams),
      this.queryAPI(toolUsageUrl + queryParams),
      this.queryAPI(quotaLimitUrl, false)
    ]);

    return {
      platform: this.platform,
      modelUsage,
      toolUsage,
      quotaLimit: this.processQuotaLimit(quotaLimit),
      timestamp: Date.now()
    };
  }

  private queryAPI(url: string, includeQueryParams: boolean = true): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);

      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + (includeQueryParams ? parsedUrl.search : ''),
        method: 'GET',
        agent: this.httpsAgent,
        timeout: 30000,
        headers: {
          'Authorization': this.authToken,
          'Accept-Language': this.platform === 'ZHIPU' ? 'zh-CN,zh;q=0.9' : 'en-US,en',
          'Content-Type': 'application/json',
          'User-Agent': 'VSCode-GLM-Usage-Monitor/1.0.0'
        }
      };

      console.log('请求 URL:', parsedUrl.href);
      console.log('请求选项:', { hostname: options.hostname, port: options.port, path: options.path });

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }

          try {
            const json = JSON.parse(data);
            resolve(json.data || json);
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', (error) => {
        console.error('请求错误:', error.message);
        console.error('请求 URL:', url);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时（30秒）'));
      });

      req.end();
    });
  }

  private processQuotaLimit(data: any): any {
    if (!data || !data.limits) return data;

    data.limits = data.limits.map((item: any) => {
      if (item.type === 'TOKENS_LIMIT') {
        return {
          type: 'Token 使用量(5小时)',
          percentage: item.percentage
        };
      }
      if (item.type === 'TIME_LIMIT') {
        return {
          type: 'MCP 使用量(1个月)',
          percentage: item.percentage,
          currentUsage: item.currentValue,
          total: item.usage,
          usageDetails: item.usageDetails
        };
      }
      return item;
    });

    return data;
  }

  private getBaseDomain(): string {
    const parsedUrl = new URL(this.baseUrl);
    return `${parsedUrl.protocol}//${parsedUrl.host}`;
  }

  private getTimeWindow(): { startTime: string; endTime: string } {
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      now.getHours(),
      0,
      0,
      0
    );
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      59,
      59,
      999
    );

    return {
      startTime: this.formatDateTime(startDate),
      endTime: this.formatDateTime(endDate)
    };
  }

  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}
