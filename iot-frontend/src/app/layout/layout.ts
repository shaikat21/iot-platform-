// iot-frontend/src/app/layout/layout.ts
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
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

import { CurrentUser, UserService, AuthSession } from '../core/service/user.service';
import { Subject, takeUntil } from 'rxjs';


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

export class LayoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // anon token (guest) stored here (same as your existing code)
  private readonly anonStorageKey = 'auth_token';

  loggedIn = false;                 // ✅ boolean
  session: AuthSession | null = null;
  user: CurrentUser | null = null;  // only if you call /me
  hasAnonToken = false;

  constructor(
    public auth: AuthService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.hasAnonToken = !!localStorage.getItem(this.anonStorageKey);

    // keep user in sync if set elsewhere
    this.userService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((u) => {
        this.user = u;
        this.cdr.detectChanges();
      });

    // source of truth: /session
    this.userService.getSession()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (s: AuthSession) => {
          this.session = s;
          this.loggedIn = !!s?.authenticated;

          if (this.loggedIn) {
            // Optional: fetch /me only if you need name/email
            this.userService.getMe().subscribe({
              next: (me) => {
                this.user = me;
                this.cdr.detectChanges();
              },
              error: () => {
                // ignore; session still works
              }
            });
          } else {
            // guest flow: ensure anon token exists
            this.ensureAnonToken();
          }

          this.cdr.detectChanges();
        },
        error: () => {
          // if session fails, treat as guest and ensure anon token
          this.session = null;
          this.loggedIn = false;
          this.ensureAnonToken();
          this.cdr.detectChanges();
        }
      });
  }

  private ensureAnonToken() {
    this.hasAnonToken = !!localStorage.getItem(this.anonStorageKey);
    if (this.hasAnonToken) return;

    this.userService.getAnonToken().subscribe({
      next: (data) => {
        const token = data?.access_token;
        if (token) {
          localStorage.setItem(this.anonStorageKey, token);
          this.hasAnonToken = true;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        // optional log
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  login() {
    this.auth.signinRedirect();
  }

  logout() {
    localStorage.removeItem(this.anonStorageKey);
    this.userService.clearCurrentUser();
    this.auth.signoutRedirect();
  }

  get userName(): string {
    // if you call /me, use that
    return this.user?.name ?? '';
  }

  get isAdmin(): boolean {
    // works even without /me
    return this.session?.roles?.includes('admin') ?? false;
  }
}