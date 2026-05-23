/**
 * Metrics Service - Prometheus metrics for observability
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;

  // Request metrics
  public readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [],
  });

  public readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.5, 1, 5],
    registers: [],
  });

  // Queue metrics
  public readonly queueJobsTotal = new Counter({
    name: 'queue_jobs_total',
    help: 'Total number of queue jobs',
    labelNames: ['queue', 'type', 'status'],
    registers: [],
  });

  public readonly queueJobDuration = new Histogram({
    name: 'queue_job_duration_seconds',
    help: 'Queue job processing duration',
    labelNames: ['queue', 'type'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
    registers: [],
  });

  public readonly queueJobsActive = new Gauge({
    name: 'queue_jobs_active',
    help: 'Number of active jobs in queue',
    labelNames: ['queue'],
    registers: [],
  });

  // Business metrics
  public readonly noticesProcessed = new Counter({
    name: 'notices_processed_total',
    help: 'Total notices processed',
    labelNames: ['status'],
    registers: [],
  });

  public readonly vendorsCreated = new Counter({
    name: 'vendors_created_total',
    help: 'Total vendors created',
    registers: [],
  });

  constructor() {
    this.registry = new Registry();
    this.registry.registerMetric(this.httpRequestsTotal);
    this.registry.registerMetric(this.httpRequestDuration);
    this.registry.registerMetric(this.queueJobsTotal);
    this.registry.registerMetric(this.queueJobDuration);
    this.registry.registerMetric(this.queueJobsActive);
    this.registry.registerMetric(this.noticesProcessed);
    this.registry.registerMetric(this.vendorsCreated);
  }

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry });
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  // Helper methods
  recordHttpRequest(method: string, route: string, status: number, duration: number) {
    this.httpRequestsTotal.inc({ method, route, status });
    this.httpRequestDuration.observe({ method, route, status }, duration);
  }

  recordJobCompleted(queue: string, type: string, duration: number) {
    this.queueJobsTotal.inc({ queue, type, status: 'completed' });
    this.queueJobDuration.observe({ queue, type }, duration);
  }

  recordJobFailed(queue: string, type: string) {
    this.queueJobsTotal.inc({ queue, type, status: 'failed' });
  }

  updateActiveJobs(queue: string, count: number) {
    this.queueJobsActive.set({ queue }, count);
  }
}
