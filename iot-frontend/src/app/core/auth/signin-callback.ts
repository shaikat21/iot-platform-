import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'signin-callback',
  standalone: false,
  template: `<p>Signing in...</p>`
})

export class SigninCallback implements OnInit {
  constructor(private authService: AuthService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.authService.signinCallback();

      const redirectUrl = this.authService.getAuthGuardInterceptedPathname();

      await this.router.navigateByUrl(redirectUrl);
    } catch (error) {
      console.error('Signin callback error:', error);
      await this.router.navigate(['/signin/error']);
    }
  }
}
