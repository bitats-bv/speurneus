import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { db } from '../data/db';
import { liveSignal } from '../data/live';
import { huidigSchooljaar, maakKlas, vergelijkNamen } from '../data/klasbeheer';

interface KlasRegel {
  id: string;
  naam: string;
  schooljaar: string;
  aantalKinderen: number;
}

@Component({
  selector: 'app-juf',
  imports: [RouterLink],
  template: `
    <header class="balk">
      <a routerLink="/" class="knop licht">← Terug</a>
      <h1>Mijn klassen</h1>
      <span></span>
    </header>

    <section class="kaart">
      @for (klas of klassen(); track klas.id) {
        <a class="klasregel" [routerLink]="['/juf/klas', klas.id]">
          <strong>{{ klas.naam }}</strong>
          <span class="zacht">{{ klas.schooljaar }}</span>
          <span class="zacht">{{ klas.aantalKinderen }} kinderen</span>
          <span aria-hidden="true">›</span>
        </a>
      } @empty {
        <p class="zacht">Nog geen klassen. Maak hieronder je eerste klas aan.</p>
      }
    </section>

    <form class="kaart formulier" (submit)="$event.preventDefault(); nieuweKlas()">
      <h2>Nieuwe klas</h2>
      <label>
        Naam
        <input
          [value]="naam()"
          (input)="naam.set($any($event.target).value)"
          placeholder="bv. 2de kleuter Vlinders"
          required
        />
      </label>
      <label>
        Schooljaar
        <input
          [value]="schooljaar()"
          (input)="schooljaar.set($any($event.target).value)"
          placeholder="2026-2027"
          required
        />
      </label>
      <button class="knop" type="submit" [disabled]="!naam().trim() || !schooljaar().trim()">
        Klas aanmaken
      </button>
    </form>
  `,
  styles: `
    .klasregel {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 1rem;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #eee;
      color: inherit;
      text-decoration: none;
      text-align: left;
      font-size: 1.2rem;
    }
    .klasregel:last-child {
      border-bottom: none;
    }
  `,
})
export class JufPage {
  protected readonly klassen = liveSignal<KlasRegel[]>(async () => {
    const [klassen, kinderen] = await Promise.all([db.klassen.toArray(), db.kinderen.toArray()]);
    return klassen
      .map((k) => ({
        ...k,
        aantalKinderen: kinderen.filter((c) => c.klasId === k.id && c.actief).length,
      }))
      .sort((a, b) => b.schooljaar.localeCompare(a.schooljaar) || vergelijkNamen(a.naam, b.naam));
  }, []);

  protected readonly naam = signal('');
  protected readonly schooljaar = signal(huidigSchooljaar());

  protected async nieuweKlas(): Promise<void> {
    if (!this.naam().trim() || !this.schooljaar().trim()) return;
    await maakKlas(this.naam(), this.schooljaar());
    this.naam.set('');
  }
}
