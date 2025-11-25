import { Component, OnInit, inject } from '@angular/core';
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

  async ngOnInit() {

        // ✅ STOP SSR FROM EXECUTING LOGIN LOGIC
    if (typeof window === 'undefined') {
      return; // <-- minimal fix
    }

    // Read raw browser URL before Angular router processes it
    const rawUrl = window.location.href;

    try {
      await this.oauth.tryLoginCodeFlow({ customHashFragment: rawUrl });

      if (this.oauth.hasValidAccessToken()) {
        this.router.navigateByUrl('/dashboard');
      } else {
        this.router.navigateByUrl('/');
      }
    } catch (e) {
      console.error("Callback login failed", e);
      this.router.navigateByUrl('/');
    }
  }
}
