import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CurrentUser {
  userId: string;
  roles: string[];
  email: string;
  name: string;
  emailVerified: boolean;
}

export interface AuthSession {
  authenticated: boolean;
  userId: string;
  roles: string[];
}


@Injectable({ providedIn: 'root' })
export class UserService {
  private baseUrl = environment.api.baseUrl;
  private storageKey = 'currentUser';

  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  public currentUser$: Observable<CurrentUser | null> = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem(this.storageKey);
    if (storedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(this.storageKey);
      }
    }
  }

  getSession(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/session`);
  }

  getMe(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.baseUrl}/me`).pipe(
      tap((user) => this.setCurrentUser(user))
    );
  }

  // sync getter
  getCurrentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: CurrentUser): void {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getAnonToken(): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/anontoken`,
      {},
      {
        headers: {
          'x-iot-fe-key': environment.anon_token_secret
        }
      }
    );
  }

  clearCurrentUser(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('auth_token');
    this.currentUserSubject.next(null);
  }

  // convenience getters
  get userName(): string {
    return this.getCurrentUser()?.name ?? '';
  }

  get isAdmin(): boolean {
    return this.getCurrentUser()?.roles?.includes('admin') ?? false;
  }
}
