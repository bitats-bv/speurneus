import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <img class="schoollogo" src="iconen/klim-op-logo.png" alt="GO! Basisschool Klim-Op" />
    <h1>Speurneus</h1>
    <nav>
      <a routerLink="/juf">Juf-beheer</a>
      <a routerLink="/spel">Spel</a>
      <a routerLink="/resultaten">Resultaten</a>
    </nav>
  `,
  styles: `
    .schoollogo {
      display: block;
      width: min(320px, 70vw);
      height: auto;
      margin: 1.5rem auto 0;
      padding: 0.5rem 1rem;
      background: #fff;
      border-radius: 1rem;
      box-sizing: content-box;
    }
    nav {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
    }
    a {
      font-size: 1.5rem;
      padding: 1rem 2rem;
      border-radius: 1rem;
      background: #ffcc00;
      color: #222;
      text-decoration: none;
    }
  `,
})
export class Home {}
