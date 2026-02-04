
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
import { catchError, map, tap } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from '../service/user.service';
import { PushService } from '../service/push.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthSession } from './auth.types';
import { authConfig } from './auth.config';


@Injectable({ providedIn: 'root' })
export class AuthService {
  
  private eventsWired = false;

  private syncInFlight?: Promise<void>;

  private lastCookieExchangedForToken?: string;
  private cookieExchangeInFlight?: Promise<void>;

  private lastMeFetchedForToken?: string;
  private meFetchInFlight?: Promise<void>;

  private authCookieCleared = false;
  
  private readyResolve!: () => void;
  private readyPromise = new Promise<void>((resolve) => {
    this.readyResolve = resolve;
  });
  
  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  /** Emits identity claims (or null) */
  private user$ = new BehaviorSubject<any | null>(null);
  user = toSignal(this.user$);

  /** Emits whether access token is valid */
    private isAuthenticated$!: Observable<boolean>;
    isAuthenticated!: ReturnType<typeof toSignal>;

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
    this.isAuthenticated$ = this.user$.pipe(
      map(() => this.oauth.hasValidAccessToken())
    );
    this.isAuthenticated = toSignal(this.isAuthenticated$, { initialValue: false });
    this.initialize();
  }

ready(): Promise<void> {
  return this.readyPromise;
}


  private async initialize(): Promise<void> {
  try {
    this.oauth.configure(authConfig);

    await this.oauth.loadDiscoveryDocumentAndTryLogin({
      preventClearHashAfterLogin: true,
    });

    this.wireEvents();
    await this.syncUserFromTokens();
    this.oauth.setupAutomaticSilentRefresh();
  } catch (e) {
    console.error('Auth init error:', e);
    this.authError$.next(e);
  } finally {
    this.readyResolve(); 
  }
}


  private wireEvents(): void {
    if (this.eventsWired) return;
    this.eventsWired = true;

    this.oauth.events.subscribe((e: OAuthEvent) => {
      if (e.type === 'token_received' || e.type === 'token_refreshed') {
        this.syncUserFromTokens();
      }

      if (e.type === 'logout' || e.type === 'session_terminated' || e.type === 'session_error') {
        this.user$.next(null);

        // reset per-token guards so next login works cleanly
        this.lastCookieExchangedForToken = undefined;
        this.lastMeFetchedForToken = undefined;
        this.authCookieCleared = false;
      }

      if (e instanceof OAuthErrorEvent) {
        console.error('OAuth error event:', e);
        this.authError$.next(e);
      }
    });
  }


  // call annon cokie

  private anonCookieOnce?: Promise<void>;

  private ensureAnonCookieOnceInternal(): Promise<void> {
    if (this.anonCookieOnce) return this.anonCookieOnce;
  
    this.anonCookieOnce = firstValueFrom(
      this.http.post(
        `${environment.api.baseUrl}/anon-cookie`,
        {},
        {
          withCredentials: true,
          headers: { 'x-iot-fe-key': environment.anon_token_secret },
        }
      )
    )
      .then(() => undefined)
      .catch(() => undefined); // never block app
  
    return this.anonCookieOnce;
  }

  ensureAnonCookieOnce(): Promise<void> {
  return this.ensureAnonCookieOnceInternal();
}


// sync identity from tokens to user$
  private async syncUserFromTokens(): Promise<void> {
    // Global de-dupe: if multiple callers trigger this at once, run only once.
    if (this.syncInFlight) return this.syncInFlight;

    this.syncInFlight = (async () => {
      const claims = this.oauth.getIdentityClaims() as any | null;
      const accessToken = this.oauth.getAccessToken();
      const idToken = this.oauth.getIdToken();

      if (!accessToken || !this.oauth.hasValidAccessToken()) {
        this.user$.next(null);

        const url = window.location.href;
        const inCallback = url.includes('code=') || url.includes('state=');

        if (!inCallback) {
          await this.ensureAnonCookieOnceInternal();
        }
        return;
        }

      // Always keep your user$ updated (cheap, no network)
      this.user$.next({
        ...claims,
        access_token: accessToken,
        id_token: idToken,
        expires_at: this.oauth.getAccessTokenExpiration(),
      });

      // 1) Exchange token -> HttpOnly cookie (ONLY once per token, and only one in-flight)
      if (this.lastCookieExchangedForToken !== accessToken) {
        if (!this.cookieExchangeInFlight) {
          this.cookieExchangeInFlight = firstValueFrom(
            this.http.post(
              `${environment.api.baseUrl}/cookie`,
              {},
              {
                withCredentials: true,
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            )
          )
            .then(() => {
              this.lastCookieExchangedForToken = accessToken;
              this.authCookieCleared = false;
            })
            .catch((e) => {
              // don't break login if cookie fails
              console.warn('Failed to set auth cookie', e);
            })
            .finally(() => {
              this.cookieExchangeInFlight = undefined;
            });
        }

        await this.cookieExchangeInFlight;
      }

      // 2) /me + push subscribe (ONLY once per token, and only one in-flight)
      if (this.lastMeFetchedForToken !== accessToken) {
        if (!this.meFetchInFlight) {
          this.meFetchInFlight = (async () => {
 //           try {
 //             const currentUser: any = await firstValueFrom(this.userService.getMe());
 //             if (currentUser) {
 //               currentUser.sub = currentUser.userId;
 //               this.userService.setCurrentUser(currentUser);
 //               await this.pushService.subscribe();
 //               this.lastMeFetchedForToken = accessToken;
 //             }
 //           } catch (e) {
 //             console.warn('getMe/push subscribe failed:', e);
 //           }
          })().finally(() => {
            this.meFetchInFlight = undefined;
          });
        }

        await this.meFetchInFlight;
      }
    })().finally(() => {
      this.syncInFlight = undefined;
    });

    return this.syncInFlight;
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
      await this.ready();
      //await this.oauth.loadDiscoveryDocumentAndTryLogin();
      //await this.oauth.tryLoginCodeFlow();
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
    } //finally {
      //this.cleanupAfterSignout();
   // }
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
      //this.clearAuthCookie();
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


async clearAuthCookie(): Promise<void> {
  if (this.authCookieCleared) {
    console.debug('[Auth] clearAuthCookie skipped (already cleared)');
    return;
  }
  this.authCookieCleared = true;
  try {
    await firstValueFrom(
      this.http.delete(`${environment.api.baseUrl}/cookie`, { withCredentials: true })
    );
  } catch (e) {
    // ignore (token may already be gone)
  }
}

private cleanupAfterSignout(): void {
  this.user$.next(null);
  localStorage.removeItem('authGuardInterceptedPathname');
  localStorage.removeItem('currentUser');

  // clear HttpOnly cookie on backend
  this.clearAuthCookie();
  this.ensureAnonCookieOnceInternal();
}



//  private cleanupAfterSignout(): void {
//  this.user$.next(null);
//  localStorage.removeItem('authGuardInterceptedPathname');
//  localStorage.removeItem('auth_token');
//}


private sessionInFlight?: Promise<AuthSession | null>;
private sessionCache?: { value: AuthSession | null; expiresAt: number };


async getSession(force = false): Promise<AuthSession | null> {
  const now = Date.now();

  // Optional: tiny cache to avoid re-fetch within same boot burst (enterprise pattern)
  if (!force && this.sessionCache && this.sessionCache.expiresAt > now) {
    return this.sessionCache.value;
  }

  if (this.sessionInFlight) return this.sessionInFlight;

  this.sessionInFlight = (async () => {
    try {
      // ensure auth init finished first (important on refresh)
      await this.whenReady();

      const s = await firstValueFrom(
        this.http.get<AuthSession>(`${environment.api.baseUrl}/session`, {
          withCredentials: true,
        })
      );

      // cache for a short burst (e.g. 1s) to prevent immediate duplicates
      this.sessionCache = { value: s, expiresAt: now + 1000 };
      return s;
    } catch {
      this.sessionCache = { value: null, expiresAt: now + 1000 };
      return null;
    } finally {
      this.sessionInFlight = undefined;
    }
  })();

  return this.sessionInFlight;
}

  

}

