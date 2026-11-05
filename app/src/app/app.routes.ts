import { Routes } from '@angular/router';
import { Home } from './home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'juf', loadComponent: () => import('./juf/juf').then((m) => m.JufPage) },
  { path: 'juf/klas/:id', loadComponent: () => import('./juf/klas').then((m) => m.KlasPage) },
  { path: 'spel', loadComponent: () => import('./spel/spel').then((m) => m.SpelPage) },
  {
    path: 'spel/kinderen',
    loadComponent: () => import('./spel/kindkeuze').then((m) => m.KindkeuzePage),
  },
  {
    path: 'spel/speel/:kindId',
    loadComponent: () => import('./spel/speel').then((m) => m.SpeelPage),
  },
  {
    path: 'resultaten',
    loadComponent: () => import('./resultaten/resultaten').then((m) => m.ResultatenPage),
  },
  { path: '**', redirectTo: '' },
];
