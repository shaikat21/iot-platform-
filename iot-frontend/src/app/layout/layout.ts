import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import {MatMenuModule} from '@angular/material/menu';
import { DeviceService } from '../platformDetection/platform-detect.service';
import { AuthService } from '../core/auth/auth.service';


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent {

  constructor(public auth: AuthService) {}

  login() {
    this.auth.signinRedirect();
  }

  logout() {
    this.auth.signoutRedirect();
  }

  get loggedIn() {
    return this.auth.isAuthenticated();
  }

  get userName(): string {
    const user = this.auth.user();
    return user?.name ?? '';
}

}
