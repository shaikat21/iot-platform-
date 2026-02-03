//app/core/interceptors/auth.interceptor.ts

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
import { Router } from '@angular/router';
import { UserService } from '../service/user.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private userService: UserService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authReq = req;

    const token = localStorage.getItem('auth_token');

    // ADDED THIS LINE to stop oidc to call directly IAM for user info, Farukh please check
    // if (!req.url.startsWith('https://api.myimprint.ca')) {
    //  return next.handle(req);
    //}

    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.warn('Unauthorized! Redirecting to login...');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('currentUser');
          window.location.reload();
        } else if (error.status === 403) {
          console.error('Access denied!');
        } else if (error.status === 500) {
          console.error('Server error:', error.message);
        }
        return throwError(() => error);
      })
    );
  }
}
