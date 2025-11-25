// src/app/auth/callback.ts
import { Component, inject, OnInit } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';

@Component({
  selector: 'auth-callback',
  standalone: true,
  template: `<p>Signing in...</p>`
})
export class AuthCallbackComponent implements OnInit {

  private oauth = inject(OAuthService);
  private router = inject(Router);

  ngOnInit() {

    // SSR FIX
    if (typeof window === 'undefined') {
      return;
    }

    this.oauth.tryLoginCodeFlow().then(() => {

      console.log("TOKEN:", this.oauth.getAccessToken());
      console.log("HAS TOKEN:", this.oauth.hasValidAccessToken());

      if (this.oauth.hasValidAccessToken()) {
        this.router.navigateByUrl('/dashboard');
      } else {
        this.router.navigateByUrl('/');
      }
    }
  );
  }
}
