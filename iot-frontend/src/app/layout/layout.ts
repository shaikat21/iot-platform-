// iot-frontend/src/app/layout/layout.ts
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
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
    MatButtonModule,
    MatIcon
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
      this.safeSet(() => {
        this.user = u;
      });
    });

  // wait for auth bootstrap
  await this.auth.whenReady();

  const s = await this.auth.getSession();

  this.safeSet(() => {
    this.session = s;
    this.loggedIn = !!s?.authenticated;
  });

  if (!s?.authenticated) {
    await this.auth.ensureAnonCookieOnce();
    this.safeSet(() => {
      this.user = null;
    });
    return;
  }

  this.userService.getMe().subscribe({
    next: (me) => {
      this.safeSet(() => {
        this.user = me;
      });
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
  }

  get userName(): string {
    return this.user?.name ?? '';
  }

  get isAdmin(): boolean {
    return this.session?.roles?.includes('admin') ?? false;
  }
 
  private safeSet(fn: () => void) {
  queueMicrotask(() => {
    fn();
    this.cdr.markForCheck();
  });
}

}

