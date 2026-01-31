import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  getMe(): Observable<any> {
    return of(null);
  }

  setCurrentUser(_user: any): void {}
}
