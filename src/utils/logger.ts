import pino from 'pino';

const baseLogger = pino({
  base: undefined,
  formatters: {
    level(label: string): { level: string } {
      return { level: label };
    },
  },
});

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export const logger: Logger = {
  info(message: string, context: Record<string, unknown> = {}): void {
    baseLogger.info(context, message);
  },
  warn(message: string, context: Record<string, unknown> = {}): void {
    baseLogger.warn(context, message);
  },
  error(message: string, context: Record<string, unknown> = {}): void {
    baseLogger.error(context, message);
  },
};
