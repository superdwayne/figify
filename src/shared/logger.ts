/**
 * Logger Service - Centralized logging with levels, buffering, and context tagging
 *
 * Provides structured logging for both main (Figma sandbox) and UI (iframe) contexts.
 * Supports DEBUG mode detection, log level filtering, and buffer retrieval for debugging.
 */

/**
 * Log levels in order of severity (lower = more verbose)
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Log entry stored in the buffer
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Logger context name (e.g., 'main', 'ui', 'generator') */
  context: string;
  /** Initial log level (defaults to INFO in production, DEBUG in development) */
  level?: LogLevel;
  /** Maximum number of log entries to buffer (default: 100) */
  bufferSize?: number;
  /** Enable console output (default: true) */
  consoleOutput?: boolean;
}

// Default configuration values
const DEFAULT_BUFFER_SIZE = 100;
const DEFAULT_CONSOLE_OUTPUT = true;

/**
 * Detect if running in development mode
 *
 * In Figma plugins, we check for common development indicators:
 * - 'localhost' in the window location (UI running locally)
 * - DEV or DEBUG environment-like flags
 *
 * Note: Figma plugins don't have access to process.env, so we use
 * alternative detection methods.
 */
function isDebugMode(): boolean {
  // Check if we're in a browser context (UI thread)
  if (typeof window !== 'undefined') {
    // Check for localhost development server
    if (window.location?.hostname === 'localhost') {
      return true;
    }
    // Check for debug URL parameter
    if (window.location?.search?.includes('debug=true')) {
      return true;
    }
  }

  // Default to debug mode during development
  // In production builds, this can be set to false via build configuration
  // For now, enable debug by default to help with plugin development
  return true;
}

/**
 * Logger class with level filtering, buffering, and context tagging
 */
export class Logger {
  private context: string;
  private level: LogLevel;
  private buffer: LogEntry[];
  private bufferSize: number;
  private consoleOutput: boolean;

  constructor(config: LoggerConfig) {
    this.context = config.context;
    this.level = config.level ?? (isDebugMode() ? LogLevel.DEBUG : LogLevel.INFO);
    this.bufferSize = config.bufferSize ?? DEFAULT_BUFFER_SIZE;
    this.consoleOutput = config.consoleOutput ?? DEFAULT_CONSOLE_OUTPUT;
    this.buffer = [];
  }

  /**
   * Set the current log level
   * Messages below this level will be filtered out
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Get the buffered log entries
   * Returns a copy of the buffer to prevent external modification
   */
  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Clear the log buffer
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Log a debug message
   * Use for verbose information useful during development
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   * Use for general operational information
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   * Use for potentially problematic situations
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   * Use for error conditions and failures
   */
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Internal log method that handles level filtering, buffering, and output
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    // Create log entry
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      context: this.context,
      message,
      data,
    };

    // Always buffer (even if below current level) for debugging
    this.addToBuffer(entry);

    // Check if this log should be output based on current level
    if (level < this.level) {
      return;
    }

    // Output to console if enabled
    if (this.consoleOutput) {
      this.outputToConsole(entry);
    }
  }

  /**
   * Add entry to the circular buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);

    // Remove oldest entries if buffer exceeds max size
    while (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * Output log entry to console with formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${this.context}]`;
    const levelName = LogLevel[entry.level];

    // Select appropriate console method based on level
    const consoleFn = this.getConsoleFn(entry.level);

    // Format output
    if (entry.data !== undefined) {
      consoleFn(`${prefix} ${levelName}:`, entry.message, entry.data);
    } else {
      consoleFn(`${prefix} ${levelName}:`, entry.message);
    }
  }

  /**
   * Get the appropriate console function for a log level
   * Note: Some environments (like Figma plugin sandbox) may not have all console methods
   */
  private getConsoleFn(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        // console.debug may not exist in Figma sandbox, fall back to console.log
        return (console.debug ?? console.log).bind(console);
      case LogLevel.INFO:
        return console.log.bind(console);
      case LogLevel.WARN:
        return (console.warn ?? console.log).bind(console);
      case LogLevel.ERROR:
        return (console.error ?? console.log).bind(console);
      default:
        return console.log.bind(console);
    }
  }

  /**
   * Create a child logger with a sub-context
   * Useful for creating module-specific loggers that inherit settings
   */
  child(subContext: string): Logger {
    return new Logger({
      context: `${this.context}:${subContext}`,
      level: this.level,
      bufferSize: this.bufferSize,
      consoleOutput: this.consoleOutput,
    });
  }
}

/**
 * Singleton logger instances for main and UI contexts
 * These are pre-configured with appropriate context names
 */

/** Logger instance for the main thread (Figma sandbox) */
export const mainLogger = new Logger({ context: 'main' });

/** Logger instance for the UI thread (iframe) */
export const uiLogger = new Logger({ context: 'ui' });

/**
 * Create a custom logger with specific configuration
 * Use this for module-specific loggers that need different settings
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

/**
 * Get log level from string (useful for configuration)
 */
export function parseLogLevel(level: string): LogLevel {
  const normalized = level.toUpperCase();
  switch (normalized) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'SILENT':
    case 'NONE':
    case 'OFF':
      return LogLevel.SILENT;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Format log entries for export/display
 * Returns a human-readable string representation of buffered logs
 */
export function formatLogBuffer(entries: LogEntry[]): string {
  return entries
    .map((entry) => {
      const date = new Date(entry.timestamp);
      const timeStr = date.toISOString();
      const levelStr = LogLevel[entry.level].padEnd(5);
      const dataStr = entry.data !== undefined
        ? ` ${JSON.stringify(entry.data)}`
        : '';
      return `${timeStr} [${entry.context}] ${levelStr} ${entry.message}${dataStr}`;
    })
    .join('\n');
}
