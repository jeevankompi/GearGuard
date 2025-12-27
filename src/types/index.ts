/**
 * Common types and interfaces for Gear Guard
 */

export interface Config {
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  version: string;
}

export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
