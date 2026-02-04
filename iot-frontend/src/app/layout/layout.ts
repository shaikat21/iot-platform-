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
import { CurrentUser, UserService } from '../core/service/user.service';
import type { AuthSession } from '../core/auth/auth.types';
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

  loggedIn = false;
  session: AuthSession | null = null;
  user: CurrentUser | null = null;

  constructor(
    public auth: AuthService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
  this.userService.currentUser$
    .pipe(takeUntil(this.destroy$))
    .subscribe((u) => {
      this.user = u;
      this.cdr.detectChanges();
    });

  // wait for auth bootstrap
  await this.auth.whenReady();

  const s = await this.auth.getSession();

  this.session = s;
  this.loggedIn = !!s?.authenticated;

  if (!this.loggedIn) {
    await this.auth.ensureAnonCookieOnce();
    this.user = null;
    this.cdr.detectChanges();
    return;
  }

  this.userService.getMe().subscribe({
    next: (me) => {
      this.user = me;
      this.cdr.detectChanges();
    },
    error: () => {}
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
    this.userService.clearCurrentUser();
    this.auth.signoutRedirect();
    // ✅ no anon-cookie call here
  }

  get userName(): string {
    return this.user?.name ?? '';
  }

  get isAdmin(): boolean {
    return this.session?.roles?.includes('admin') ?? false;
  }
}