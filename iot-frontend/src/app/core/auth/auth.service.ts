
// iot-frontend/src/app/core/auth/auth.service.ts
import { Injectable, Inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  OAuthService,
  OAuthEvent,
  OAuthSuccessEvent,
  OAuthErrorEvent,
  AuthConfig,
} from 'angular-oauth2-oidc';
import { BehaviorSubject, Observable, firstValueFrom, of } from 'rxjs';
import { catchError, filter, map, tap } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from '../service/user.service';
import { PushService } from '../service/push.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthSession } from './auth.types';
import { authConfig } from './auth.config';


@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Emits identity claims (or null) */
  private user$ = new BehaviorSubject<any | null>(null);
  user = toSignal(this.user$);

  /** Emits whether access token is valid */
  private isAuthenticated$: Observable<boolean> = this.user$.pipe(
    map(() => this.oauth.hasValidAccessToken())
  );
  isAuthenticated = toSignal(this.isAuthenticated$);

  /** Any auth errors */
  public authError$ = new BehaviorSubject<unknown>(null);
  public authError = toSignal(this.authError$);

  constructor(
    private oauth: OAuthService,
    private router: Router,
    private userService: UserService,
    private pushService: PushService,
    private http: HttpClient,
  ) {
    this.initialize();
  }

  private async initialize(): Promise<void> {
  try {
    this.oauth.configure(authConfig);

    await this.oauth.loadDiscoveryDocumentAndTryLogin({
      preventClearHashAfterLogin: true,
    });

    this.wireEvents();
    this.syncUserFromTokens();
    this.oauth.setupAutomaticSilentRefresh();
  } catch (e) {
    console.error('Auth init error:', e);
    this.authError$.next(e);
  }
}


  private wireEvents(): void {
    this.oauth.events.subscribe((e: OAuthEvent) => {
      // Token received / refreshed
      if (e.type === 'token_received' || e.type === 'token_refreshed') {
        this.syncUserFromTokens();
      }

      // Logout / session terminated
      if (e.type === 'logout' || e.type === 'session_terminated' || e.type === 'session_error') {
        this.user$.next(null);
      }

      // Errors
      if (e instanceof OAuthErrorEvent) {
        console.error('OAuth error event:', e);
        this.authError$.next(e);
      }
    });
  }

  private async syncUserFromTokens(): Promise<void> {
    const claims = this.oauth.getIdentityClaims() as any | null;

    // keep your existing "user" concept similar to oidc-client-ts User
    const accessToken = this.oauth.getAccessToken();
    const idToken = this.oauth.getIdToken();

    if (!accessToken || !this.oauth.hasValidAccessToken()) {
      this.user$.next(null);
      return;
    }

    // store token if you want (but interceptor is better than localStorage)
    localStorage.setItem('auth_token', accessToken);

    // push claims into stream
    this.user$.next({
      ...claims,
      access_token: accessToken,
      id_token: idToken,
      expires_at: this.oauth.getAccessTokenExpiration(), // epoch ms
    });

    // replicate your “after login” flow
    try {
      const currentUser: any = await firstValueFrom(this.userService.getMe());
      if (currentUser) {
        currentUser.sub = currentUser.userId;
        this.userService.setCurrentUser(currentUser);
        await this.pushService.subscribe();
      }
    } catch (e) {
      // don’t break auth if /me fails
      console.warn('getMe/push subscribe failed:', e);
    }
  }

  /** Similar to getUser() in oidc-client-ts */
  getUser(): Observable<any | null> {
    return of(null).pipe(
      tap(() => this.syncUserFromTokens()),
      map(() => this.user$.value),
      catchError((e) => {
        console.error('Error getting user:', e);
        this.authError$.next(e);
        return of(null);
      })
    );
  }

  /** Redirect login (similar to signinRedirect) */
  async signinRedirect(): Promise<void> {
    try {
      this.oauth.initCodeFlow(); // redirects
    } catch (e) {
      console.error('signinRedirect error:', e);
      this.authError$.next(e);
      throw e;
    }
  }

  /**
   * Popup login: angular-oauth2-oidc does not provide a first-class
   * "signinPopup" like oidc-client-ts.
   *
   * Recommended: use redirect flow.
   * If you *must* do popup, we can implement a custom window.open + postMessage flow.
   */
  async signinPopup(): Promise<void> {
    const err = new Error('signinPopup is not built-in for angular-oauth2-oidc. Use redirect flow or implement custom popup.');
    this.authError$.next(err);
    throw err;
  }

  /** Silent refresh attempt (similar to signinSilent) */
  async signinSilent(): Promise<void> {
    try {
      // If refresh tokens are enabled and present, this will renew tokens
      await this.oauth.silentRefresh();
      await this.syncUserFromTokens();
    } catch (e) {
      console.error('signinSilent/silentRefresh error:', e);
      this.authError$.next(e);
      throw e;
    }
  }

  /**
   * Callback handler:
   * With angular-oauth2-oidc, loadDiscoveryDocumentAndTryLogin() already processes it.
   * Keep this method for compatibility with your current routing.
   */
  async signinCallback(): Promise<void> {
    try {
      await this.oauth.tryLoginCodeFlow();
      await this.syncUserFromTokens();

      // redirect to intercepted path if any
      const next = this.getAuthGuardInterceptedPathname();
      localStorage.removeItem('authGuardInterceptedPathname');
      await this.router.navigateByUrl(next || '/');
    } catch (e) {
      console.error('signinCallback error:', e);
      this.authError$.next(e);
      await this.router.navigate(['/signin/error']);
      throw e;
    }
  }

  /** Redirect logout (similar to signoutRedirect) */
  async signoutRedirect(): Promise<void> {
    try {
      this.oauth.logOut();
    } catch (e) {
      console.error('signoutRedirect error:', e);
      this.authError$.next(e);
      throw e;
    } finally {
      this.cleanupAfterSignout();
    }
  }

  /**
   * Signout callback:
   * Some IdPs redirect back after logout; this is usually just navigation cleanup.
   */
  async signoutCallback(): Promise<void> {
    try {
      // nothing mandatory here; tokens are typically already cleared
    } catch (e) {
      console.error('signoutCallback error:', e);
      this.authError$.next(e);
      throw e;
    } finally {
      this.cleanupAfterSignout();
    }
  }

  setAuthGuardInterceptedPathname(path?: string): void {
    const p = path || window.location.pathname;
    localStorage.setItem('authGuardInterceptedPathname', p);
  }

  getAuthGuardInterceptedPathname(): string {
    return localStorage.getItem('authGuardInterceptedPathname') || '/';
  }

  private cleanupAfterSignout(): void {
  this.user$.next(null);

  // Clear OAuth tokens without redirect
  this.oauth.logOut(false);

  localStorage.removeItem('authGuardInterceptedPathname');
  localStorage.removeItem('auth_token');
}

  async getSession(): Promise<AuthSession | null> {
    try {
      return await firstValueFrom(
        this.http.get<AuthSession>(`${environment.api.baseUrl}/auth/session`)
      );
    } catch (err) {
      return null;
    }
  }

}

