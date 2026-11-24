export interface AppEnvironment {
  readonly production: boolean;
  readonly apiBaseUrl: string;
  readonly appVersion: string;
}

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: '/api/v1',
  appVersion: '0.1.0',
};
