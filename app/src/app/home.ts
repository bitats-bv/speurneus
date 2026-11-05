import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <h1>Speurneus</h1>
    <nav>
      <a routerLink="/juf">Juf-beheer</a>
      <a routerLink="/spel">Spel</a>
      <a routerLink="/resultaten">Resultaten</a>
    </nav>
  `,
  styles: `
    nav { display: flex; gap: 1.5rem; justify-content: center; }
    a { font-size: 1.5rem; padding: 1rem 2rem; border-radius: 1rem; background: #ffcc00; color: #222; text-decoration: none; }
  `,
})
export class Home {}
