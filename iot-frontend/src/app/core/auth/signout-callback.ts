//src/app/auth/signed-out.ts
import { Component, OnInit} from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signed-out',
  standalone: true,
  template: `<p>You have been signed out.</p>`,
})
export class SignoutCallback implements OnInit {
  constructor(private authService: AuthService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.authService.signoutCallback();
    } catch (error) {
      console.error('Signout callback error:', error);
    } finally {
      await this.router.navigate(['/']);
    }
  }
}
