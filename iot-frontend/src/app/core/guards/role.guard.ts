import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserRoles } from '../../shared/enums/user-roles.enum';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    await this.auth.whenReady();
    if (!this.auth.isAuthenticated()) { // signal call is OK
      this.router.navigate(['/']);
      return false;
    }

    const allowedRoles = (route.data['roles'] as UserRoles[]) || [];
    if (allowedRoles.length === 0) return true;

    const session = await this.auth.getSession();
    const roles = session?.roles || [];

    const hasAccess = roles.some(r => allowedRoles.includes(r as UserRoles));
    if (!hasAccess) this.router.navigate(['/']);

    return hasAccess;
  }
}

