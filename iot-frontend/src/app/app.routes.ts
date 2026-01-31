import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { HomeComponent } from './home/home';
import { RoleGuard } from './core/guards/role.guard';
import { UserRoles } from './shared/enums/user-roles.enum';


export const routes: Routes = [


  // Auth callback route (public)
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./core/auth/signin-callback').then((m) => m.AuthCallbackComponent),
  },

  // Signed out route (public)
  {
    path: 'signedout',
    loadComponent: () =>
      import('./core/auth/signed-out').then((m) => m.SignedOutComponent),
  },

  {
    path: '',
    component: LayoutComponent,
    children: [
      // PUBLIC ROUTES
      { path: '', component: HomeComponent },

      // PROTECTED ROUTES
      {
        path: 'dashboard',
        canActivate: [RoleGuard],
        data: {
          roles: [UserRoles.ADMIN, UserRoles.DEVELOPER]
        },
        loadComponent: () =>
          import('./dashboard/dashboard').then((m) => m.DashboardComponent),
      },
    ],
  },
      { path: '**', redirectTo: '' },
]