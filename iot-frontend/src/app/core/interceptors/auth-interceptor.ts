import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private oauth: OAuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // only attach token to YOUR backend API
    // environment.api.baseUrl = 'http://192.168.0.104:8086/api'
    if (!req.url.startsWith(environment.api.baseUrl)) {
      return next.handle(req);
    }

    const token = this.oauth.getAccessToken(); // ✅ source of truth

    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.warn('401 Unauthorized — clearing session');

          // Clear local app state you manage
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authGuardInterceptedPathname');

          // Clear oauth tokens (no redirect)
          this.oauth.logOut(false);

          // Same behavior as your old code
          window.location.reload();
        } else if (error.status === 403) {
          console.error('403 Forbidden');
        } else if (error.status === 500) {
          console.error('500 Server error:', error.message);
        }

        return throwError(() => error);
      })
    );
  }
}
