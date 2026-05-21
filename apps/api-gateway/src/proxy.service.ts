import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

interface ProxyConfig {
  path: string;
  target: string;
  timeout?: number;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly client: AxiosInstance;

  private readonly routes: ProxyConfig[] = [
    { path: '/api/auth', target: 'http://localhost:3001/api/auth', timeout: 30000 },
    { path: '/api/businesses', target: 'http://localhost:3002', timeout: 30000 },
    { path: '/api/gst', target: 'http://localhost:3003', timeout: 30000 },
    { path: '/api/vendors', target: 'http://localhost:3004', timeout: 30000 },
  ];

  constructor() {
    this.client = axios.create({ timeout: 30000 });
  }

  findRoute(path: string): ProxyConfig | undefined {
    this.logger.log(`findRoute checking: ${path}`);
    const route = this.routes.find((route) => path.startsWith(route.path));
    this.logger.log(`matched route: ${JSON.stringify(route)}`);
    return route;
  }

  async proxy(path: string, method: string, headers: any, body: any) {
    const route = this.findRoute(path);
    
    if (!route) {
      throw new HttpException('Route not found', HttpStatus.NOT_FOUND);
    }

    // For /api/auth/* paths, strip route.path prefix
    // /api/auth/health -> /health -> http://localhost:3001/api/auth/health
    const targetPath = path.slice(route.path.length);
    const url = `${route.target}${targetPath}`;
    
    this.logger.log(`Proxying ${method} ${path} -> ${url}`);

    const config: AxiosRequestConfig = {
      method: method.toLowerCase() as any,
      url,
      headers: {
        ...headers,
        'x-forwarded-path': path,
        'x-forwarded-method': method,
      },
      data: body,
    };

    try {
      const response = await this.client.request(config);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Proxy error: ${error.message}`);
      if (error.response) {
        throw new HttpException(
          error.response.data,
          error.response.status
        );
      }
      throw new HttpException(
        'Downstream service error',
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  getHealth(): { status: string; routes: string[] } {
    return {
      status: 'healthy',
      routes: this.routes.map(r => r.path),
    };
  }
}