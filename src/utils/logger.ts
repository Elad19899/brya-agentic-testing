/**
 * ─────────────────────────────────────────────────────────────────────────────
 * src/utils/logger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimal structured logger used across the framework.
 *
 * Why not console.log directly?
 *   - Centralizing log calls lets us prefix every line with a timestamp and a
 *     severity tag, which CI log scrapers can parse.
 *   - It also gives a single place to silence/redirect output later (e.g. into
 *     Allure step attachments) without rewriting consumers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function emit(level: LogLevel, message: string, ...rest: unknown[]): void {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] ${message}`;
  // Route warn/error to stderr so CI surfaces them prominently.
  const sink = level === 'error' || level === 'warn' ? console.error : console.log;
  if (rest.length > 0) {
    sink(line, ...rest);
  } else {
    sink(line);
  }
}

export const logger = {
  debug: (msg: string, ...rest: unknown[]) => emit('debug', msg, ...rest),
  info: (msg: string, ...rest: unknown[]) => emit('info', msg, ...rest),
  warn: (msg: string, ...rest: unknown[]) => emit('warn', msg, ...rest),
  error: (msg: string, ...rest: unknown[]) => emit('error', msg, ...rest),
};
