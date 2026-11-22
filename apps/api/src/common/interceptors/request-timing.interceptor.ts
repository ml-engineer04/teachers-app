import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { monitorEventLoopDelay, IntervalHistogram } from 'perf_hooks';

let eventLoopMonitor: IntervalHistogram | null = null;

@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RequestTiming');
  private readonly isEnabled =
    process.env.REQUEST_TIMING === '1' || process.env.REQUEST_TIMING === 'true';

  constructor() {
    if (this.isEnabled && !eventLoopMonitor) {
      try {
        eventLoopMonitor = monitorEventLoopDelay({ resolution: 20 });
        eventLoopMonitor.enable();
        setInterval(() => {
          if (eventLoopMonitor) {
            const meanMs = (eventLoopMonitor.mean / 1e6).toFixed(2);
            const maxMs = (eventLoopMonitor.max / 1e6).toFixed(2);
            if (Number(maxMs) > 10) {
              this.logger.warn(
                `⏱️ [EVENT_LOOP_LAG] Mean: ${meanMs}ms | Max: ${maxMs}ms`,
              );
            }
            eventLoopMonitor.reset();
          }
        }, 10000).unref();
      } catch {
        // Ignore if monitorEventLoopDelay is unsupported
      }
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.isEnabled) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const method = req?.method || 'GET';
    const url = req?.originalUrl || req?.url || '';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsed = Date.now() - start;
          const status = res?.statusCode || 200;
          this.logger.log(`⏱️ [REQ_TIMING] ${method} ${url} | ${status} | ${elapsed}ms`);
        },
        error: (err) => {
          const elapsed = Date.now() - start;
          const status = err?.status || res?.statusCode || 500;
          this.logger.warn(`⏱️ [REQ_TIMING_ERR] ${method} ${url} | ${status} | ${elapsed}ms`);
        },
      }),
    );
  }
}
