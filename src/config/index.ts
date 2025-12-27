import type { Config } from '../types';

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config: Config = {
  environment: getEnvVar('NODE_ENV', 'development') as Config['environment'],
  logLevel: getEnvVar('LOG_LEVEL', 'info') as Config['logLevel'],
  version: getEnvVar('npm_package_version', '1.0.0'),
};

export default config;
