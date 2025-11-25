// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';

export const AuthGuard: CanActivateFn = () => {
  const oauth = inject(OAuthService);

  // Allow SSR to always render
  if (typeof window === 'undefined') {
    return true;
  }

  // Browser protection
  if (!oauth.hasValidAccessToken()) {
    oauth.initCodeFlow();
    return false;
  }

  return true;
};
