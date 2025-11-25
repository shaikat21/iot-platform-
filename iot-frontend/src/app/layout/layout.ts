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
import { OAuthService } from 'angular-oauth2-oidc';


export interface Event {
  id: number | string;
  name: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule
  ],

  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent {
  isBrowser = false;

  device = inject(DeviceService);
  private platformId = inject(PLATFORM_ID);


  constructor(private oauth: OAuthService) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  login() {
    this.oauth.initCodeFlow();
  }

  logout() {
    this.oauth.logOut();
  }

  get loggedIn() {
    return this.oauth.hasValidAccessToken();
  }
}
