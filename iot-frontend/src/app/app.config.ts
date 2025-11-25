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

  return async () => {
    if (typeof window === 'undefined') return;

    const oauth = inject(OAuthService);

    oauth.configure(authConfig);
    oauth.strictDiscoveryDocumentValidation = false;

    // Load discovery + try login from hash
    await oauth.loadDiscoveryDocumentAndTryLogin({
      preventClearHashAfterLogin: true
    });

    // If token missing → redirect to Zitadel login
    if (!oauth.hasValidAccessToken()) {
      oauth.initCodeFlow();
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideOAuthClient(),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),

    // ⭐ Correct initializer
    provideAppInitializer(() => authInitializer()()),
  ],
};
