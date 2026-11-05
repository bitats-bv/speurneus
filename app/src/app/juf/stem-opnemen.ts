import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { db } from '../data/db';
import { liveSignal } from '../data/live';
import { laadAlleThemas, type ThemaPakket } from '../spel/themapakket';

/** Juf-beheer: thema's met hoeveel vragen al met eigen stem ingesproken zijn. */
@Component({
  selector: 'app-stem-opnemen',
  imports: [RouterLink],
  template: `
    <header class="balk">
      <a routerLink="/juf" class="knop licht">← Juf</a>
      <h1>Stem opnemen</h1>
      <span></span>
    </header>

    <section class="kaart">
      <p class="zacht klein">
        Spreek elke vraag in met je eigen stem. Zonder opname hoort het kind de computerstem.
      </p>
      @if (fout()) {
        <p class="fout">Thema's konden niet geladen worden.</p>
      }
      @for (thema of themas(); track thema.id) {
        <a class="regel" [routerLink]="['/juf/stem', thema.id]">
          @if (thema.icoon) {
            <img [src]="thema.icoon" alt="" />
          }
          <strong>{{ thema.naam }}</strong>
          <span class="zacht">
            {{ aantalOpgenomen().get(thema.id) ?? 0 }} van {{ thema.vragen.length }} vragen
            opgenomen
          </span>
          <span aria-hidden="true">›</span>
        </a>
      }
    </section>
  `,
  styles: `
    .regel {
      display: grid;
      grid-template-columns: 3rem 1fr auto auto;
      gap: 1rem;
      align-items: center;
      padding: 0.75rem 0.5rem;
      border-bottom: 1px solid #eee;
      color: inherit;
      text-decoration: none;
      text-align: left;
      font-size: 1.15rem;
    }
    .regel:last-child {
      border-bottom: none;
    }
    img {
      width: 3rem;
      height: 3rem;
      object-fit: contain;
    }
  `,
})
export class StemOpnemenPage {
  protected readonly themas = signal<ThemaPakket[]>([]);
  protected readonly fout = signal(false);

  /** Aantal opnames per thema; enkel vragen die nog in het pakket bestaan tellen mee. */
  protected readonly aantalOpgenomen = liveSignal(
    () => this.themas(),
    async (themas) => {
      const opnames = await db.opnames.toArray();
      return new Map(
        themas.map((t) => {
          const ids = new Set(t.vragen.map((v) => v.id));
          return [t.id, opnames.filter((o) => o.themaId === t.id && ids.has(o.vraagId)).length];
        }),
      );
    },
    new Map<string, number>(),
  );

  constructor() {
    laadAlleThemas().then(
      (t) => this.themas.set(t),
      (e) => {
        console.error(e);
        this.fout.set(true);
      },
    );
  }
}
