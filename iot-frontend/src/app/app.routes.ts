import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { HomeComponent } from './home/home';
import { RoleGuard } from './core/guards/role.guard';
import { UserRoles } from './shared/enums/user-roles.enum';


export const routes: Routes = [


  // Auth callback route (public)
  {
    path: 'signin/callback',
    loadComponent: () =>
      import('./core/auth/signin-callback').then((m) => m.SigninCallback),
  },

  // Signed out route (public)
  {
    path: 'signedout/callback',
    loadComponent: () =>
      import('./core/auth/signout-callback').then((m) => m.SignoutCallback),
  },

{
    path: '',
    component: LayoutComponent,
    children: [
      // PUBLIC ROUTES
      { path: '', component: HomeComponent },

      // Protected route group (NO canActivateChild, keep your guard unchanged)
      {
        path: 'app',
        canActivate: [RoleGuard],
        data: {
          roles: [UserRoles.ADMIN, UserRoles.DEVELOPER, UserRoles.USER],
        },
        children: [
          {
            path: 'devices',
            loadComponent: () =>
              import('./interface/Devices/device').then((m) => m.DashboardComponent),
          },
          {
            path: 'telemetry',
            loadComponent: () =>
              import('./interface/dashboard/telemetry/telemetry').then(
                (m) => m.TelemetryComponent
              ),
          },
          {
            path: 'telemetry/:deviceId',
            loadComponent: () =>
              import('./interface/dashboard/telemetry/telemetry').then(
                (m) => m.TelemetryComponent
              ),
          },
          { path: '', pathMatch: 'full', redirectTo: 'devices' },
        ],
      },
    ],
  },
      { path: '**', redirectTo: '' },
]