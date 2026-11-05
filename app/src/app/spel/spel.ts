import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-spel',
  imports: [RouterLink],
  template: `
    <h1>Spel</h1>
    <p>Wordt uitgewerkt in de volgende fase.</p>
    <a routerLink="/">Terug</a>
  `,
})
export class SpelPage {}
