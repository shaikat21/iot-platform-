import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, from, shareReplay, finalize } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';


export interface CurrentUser {
  userId: string;
  roles: string[];
  email: string;
  name: string;
  emailVerified: boolean;
}


@Injectable({ providedIn: 'root' })
export class UserService {

  private meInFlight$?: Observable<CurrentUser>;
  private baseUrl = `${environment.api.baseUrl}/api`;

  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  public currentUser$: Observable<CurrentUser | null> = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private injector: Injector) {}

  private get auth(): AuthService {
  return this.injector.get(AuthService);
  }


  getMe(): Observable<CurrentUser> {
  // If multiple callers ask at the same time, reuse the same request.
  if (!this.meInFlight$) {
    this.meInFlight$ = this.http.get<CurrentUser>(`${this.baseUrl}/me`).pipe(
      tap((user) => this.setCurrentUser(user)),
      shareReplay(1),
      finalize(() => {
        // Allow a future refresh (e.g., after login refresh/logout/login)
        this.meInFlight$ = undefined;
      })
    );
  }

  return this.meInFlight$;
}

  getCurrentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: CurrentUser): void {
    this.currentUserSubject.next(user);
  }

  clearCurrentUser(): void {
    this.currentUserSubject.next(null);
  }

  get userName(): string {
    return this.getCurrentUser()?.name ?? '';
  }

  get isAdmin(): boolean {
    return this.getCurrentUser()?.roles?.includes('admin') ?? false;
  }
}