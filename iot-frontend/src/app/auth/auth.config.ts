//src/app/auth/auth.config.ts
import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';

export const authConfig: AuthConfig = {

  scope: 'openid profile email offline_access',
  responseType: 'code',
  oidc: true,

  clientId: environment.oauth.clientId,
  issuer: environment.oauth.issuer,
  redirectUri: environment.oauth.redirectUri,
  postLogoutRedirectUri: environment.oauth.postLogoutRedirectUri,

  requireHttps: environment.oauth.requireHttps,
  strictDiscoveryDocumentValidation: environment.oauth.strictDiscoveryDocumentValidation,
  showDebugInformation: true,
};

