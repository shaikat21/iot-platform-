import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { HomeComponent } from './home/home';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [


  // Auth callback route (public)
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./auth/callback').then((m) => m.AuthCallbackComponent),
      data: {
        hydration: false,   // ⬅ Prevent SSR hydration of this route
       // ssr: false           // ⬅ Prevent SSR execution entirely
     },
  },

  // Signed out route (public)
  {
    path: 'signedout',
    loadComponent: () =>
      import('./auth/signed-out').then((m) => m.SignedOutComponent),
    data: {
      hydration: false,
     // ssr: false
  },
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
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('./dashboard/dashboard').then((m) => m.DashboardComponent),
      },
    ],
  },

]