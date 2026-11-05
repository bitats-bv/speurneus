import { Routes } from '@angular/router';
import { Home } from './home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'juf', loadComponent: () => import('./juf/juf').then((m) => m.JufPage) },
  { path: 'spel', loadComponent: () => import('./spel/spel').then((m) => m.SpelPage) },
  {
    path: 'resultaten',
    loadComponent: () => import('./resultaten/resultaten').then((m) => m.ResultatenPage),
  },
  { path: '**', redirectTo: '' },
];
