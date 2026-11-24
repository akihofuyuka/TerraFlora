export type ErrorCode =
  | 'FILE_EMPTY'
  | 'FILE_FORMAT'
  | 'CRYPTO_FAILED'
  | 'TRUNCATED'
  | 'ASSET_LOAD'
  | 'EXPORT_VERIFY'
  | 'UNEXPECTED';

export interface AppErrorOptions {
  suggestion?: string;
  context?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly title: string;
  public readonly suggestion?: string;
  public readonly context?: Record<string, unknown>;

  constructor(code: ErrorCode, title: string, options: AppErrorOptions = {}, message?: string) {
    super(message || title, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.title = title;
    this.suggestion = options.suggestion;
    this.context = options.context;
  }
}

export function toAppError(
  err: unknown,
  fallback: { code?: ErrorCode; title?: string; suggestion?: string; context?: Record<string, unknown> } = {}
): AppError {
  if (err instanceof AppError) {
    if (fallback.context && Object.keys(fallback.context).length > 0) {
      return new AppError(
        err.code,
        err.title,
        {
          suggestion: err.suggestion ?? fallback.suggestion,
          context: { ...fallback.context, ...err.context },
          cause: err,
        },
        err.message
      );
    }
    return err;
  }

  const rawMessage = err instanceof Error ? err.message : String(err ?? '未知错误');
  return new AppError(
    fallback.code ?? 'UNEXPECTED',
    fallback.title ?? '操作过程中发生异常',
    {
      suggestion: fallback.suggestion ?? '可复制下方诊断信息反馈，或刷新页面后重试。',
      context: fallback.context,
      cause: err,
    },
    rawMessage
  );
}

export function formatDiagnosticReport(err: AppError, extra: Record<string, unknown> = {}): string {
  const ctx = { ...err.context, ...extra };
  const lines = [
    `[TerraFlora 诊断报告]`,
    `时间: ${new Date().toISOString()}`,
    `错误码: ${err.code}`,
    `标题: ${err.title}`,
    `详情: ${err.message}`,
  ];
  if (Object.keys(ctx).length > 0) {
    lines.push(`上下文: ${JSON.stringify(ctx)}`);
  }
  if (typeof navigator !== 'undefined') {
    lines.push(`环境: ${navigator.userAgent}`);
  }
  const stack = err.stack || (err.cause instanceof Error ? err.cause.stack : undefined);
  if (stack) {
    lines.push(`堆栈:\n${stack}`);
  }
  return lines.join('\n');
}
