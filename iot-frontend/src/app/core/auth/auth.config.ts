//src/app/auth/auth.config.ts
import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../../../environments/environment';

export const authConfig: AuthConfig = {
  
  issuer: environment.oidc.issuer,
  clientId: environment.oidc.clientId,
  redirectUri: environment.oidc.redirectUri,
  postLogoutRedirectUri: environment.oidc.postLogoutRedirectUri,
  responseType: 'code',
  scope: environment.oidc.scope,
  strictDiscoveryDocumentValidation: environment.oidc.strictDiscoveryDocumentValidation,
  requireHttps: environment.oidc.requireHttps,
  silentRefreshRedirectUri: environment.oidc.redirectUri,
  useSilentRefresh: true,
  sessionChecksEnabled: false,  
  showDebugInformation: !environment.production,
  
  
  
  

  
  
  
};

