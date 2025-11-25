// src/app/app.config.ts
import {
  ApplicationConfig,
  provideAppInitializer,
  inject
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { OAuthService, provideOAuthClient } from 'angular-oauth2-oidc';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { authConfig } from './auth/auth.config';

export function authInitializer() {
  if (typeof window === 'undefined') {
    return;
  }

  const oauth = inject(OAuthService);

  oauth.configure(authConfig);
  oauth.strictDiscoveryDocumentValidation = false;

  // ⭐ FIX: convert Promise<boolean> to Promise<void>
  return oauth
    .loadDiscoveryDocumentAndTryLogin({
      preventClearHashAfterLogin: true,
    })
    .then(() => {});
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideOAuthClient(),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideAppInitializer(authInitializer),
  ],
};