import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { db } from '../data/db';
import { liveSignal } from '../data/live';
import { vergelijkNamen } from '../data/klasbeheer';
import { SpelInstellingenService } from './spel-instellingen';
import { MIN_OPTIES, maxOpties } from './spelopbouw';
import { laadAlleThemas, type ThemaPakket } from './themapakket';

const MIN_VRAGEN = 2;
const MAX_VRAGEN = 20;

/** Juf kiest klas, thema, aantal antwoordopties en aantal vragen. */
@Component({
  selector: 'app-spel',
  imports: [RouterLink],
  template: `
    <header class="balk">
      <a routerLink="/" class="knop licht">← Terug</a>
      <h1>Spel klaarzetten</h1>
      <span></span>
    </header>

    <section class="kaart formulier">
      <h2>Klas</h2>
      @if (klassen().length === 0) {
        <p class="zacht">Nog geen klassen. <a routerLink="/juf">Maak eerst een klas aan.</a></p>
      }
      <div class="keuzes">
        @for (klas of klassen(); track klas.id) {
          <button
            class="knop licht"
            [class.gekozen]="klasId() === klas.id"
            (click)="klasId.set(klas.id)"
          >
            {{ klas.naam }} <span class="zacht">({{ klas.aantal }})</span>
          </button>
        }
      </div>
    </section>

    <section class="kaart formulier">
      <h2>Thema</h2>
      @if (themaFout()) {
        <p class="fout">Thema's konden niet geladen worden.</p>
      }
      <div class="keuzes">
        @for (thema of themas(); track thema.id) {
          <button
            class="thema"
            [class.gekozen]="themaId() === thema.id"
            (click)="themaId.set(thema.id)"
          >
            @if (thema.icoon) {
              <img [src]="thema.icoon" alt="" />
            }
            <strong>{{ thema.naam }}</strong>
          </button>
        }
      </div>
    </section>

    <section class="kaart formulier">
      <div class="teller">
        <h2>Antwoordopties</h2>
        <button
          class="knop licht"
          [disabled]="opties() <= minOpties"
          (click)="opties.update((n) => n - 1)"
        >
          −
        </button>
        <strong>{{ opties() }}</strong>
        <button
          class="knop licht"
          [disabled]="opties() >= maxOpt()"
          (click)="opties.update((n) => n + 1)"
        >
          +
        </button>
      </div>
      <div class="teller">
        <h2>Vragen</h2>
        <button
          class="knop licht"
          [disabled]="vragen() <= minVragen"
          (click)="vragen.update((n) => n - 1)"
        >
          −
        </button>
        <strong>{{ vragen() }}</strong>
        <button
          class="knop licht"
          [disabled]="vragen() >= maxVragen"
          (click)="vragen.update((n) => n + 1)"
        >
          +
        </button>
      </div>
    </section>

    <button class="knop groot" [disabled]="!klaar()" (click)="start()">Start ▶</button>
  `,
  styles: `
    .keuzes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .gekozen {
      outline: 4px solid #ff9933;
      background: #fff4cc;
    }
    .thema {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      font: inherit;
      padding: 0.75rem;
      border: none;
      border-radius: 1rem;
      background: #f0f0f0;
      cursor: pointer;
      min-width: 8rem;
    }
    .thema img {
      width: 5rem;
      height: 5rem;
      object-fit: contain;
    }
    .teller {
      display: grid;
      grid-template-columns: 1fr auto 3rem auto;
      align-items: center;
      gap: 0.75rem;
    }
    .teller h2 {
      margin: 0;
    }
    .teller strong {
      font-size: 1.6rem;
      text-align: center;
    }
    .teller .knop {
      width: 3rem;
      font-size: 1.5rem;
    }
    .groot {
      font-size: 1.6rem;
      padding: 1rem 3rem;
    }
  `,
})
export class SpelPage {
  private readonly router = inject(Router);
  private readonly instellingen = inject(SpelInstellingenService);
  private readonly vorige = this.instellingen.huidig();

  protected readonly minOpties = MIN_OPTIES;
  protected readonly minVragen = MIN_VRAGEN;
  protected readonly maxVragen = MAX_VRAGEN;

  protected readonly klassen = liveSignal(async () => {
    const [klassen, kinderen] = await Promise.all([db.klassen.toArray(), db.kinderen.toArray()]);
    return klassen
      .map((k) => ({
        id: k.id,
        naam: k.naam,
        aantal: kinderen.filter((c) => c.klasId === k.id && c.actief).length,
      }))
      .sort((a, b) => vergelijkNamen(a.naam, b.naam));
  }, []);

  protected readonly themas = signal<ThemaPakket[]>([]);
  protected readonly themaFout = signal(false);

  protected readonly klasId = linkedSignal(() => {
    const lijst = this.klassen();
    const voorkeur = this.vorige?.klasId;
    return lijst.find((k) => k.id === voorkeur)?.id ?? (lijst.length === 1 ? lijst[0].id : null);
  });
  protected readonly themaId = linkedSignal(() => {
    const lijst = this.themas();
    const voorkeur = this.vorige?.themaId;
    return lijst.find((t) => t.id === voorkeur)?.id ?? (lijst.length === 1 ? lijst[0].id : null);
  });

  private readonly thema = computed(() => this.themas().find((t) => t.id === this.themaId()));
  protected readonly maxOpt = computed(() => {
    const t = this.thema();
    return t ? maxOpties(t) : MIN_OPTIES;
  });
  protected readonly opties = linkedSignal(() =>
    Math.min(this.vorige?.aantalOpties ?? MIN_OPTIES, this.maxOpt()),
  );
  protected readonly vragen = signal(this.vorige?.aantalVragen ?? 6);

  protected readonly klaar = computed(() => {
    const klas = this.klassen().find((k) => k.id === this.klasId());
    return !!klas && klas.aantal > 0 && !!this.thema();
  });

  constructor() {
    laadAlleThemas().then(
      (t) => this.themas.set(t),
      (e) => {
        console.error(e);
        this.themaFout.set(true);
      },
    );
  }

  protected start(): void {
    const klasId = this.klasId();
    const themaId = this.themaId();
    if (!this.klaar() || !klasId || !themaId) return;
    this.instellingen.zet({
      klasId,
      themaId,
      aantalOpties: this.opties(),
      aantalVragen: this.vragen(),
    });
    void this.router.navigate(['/spel/kinderen']);
  }
}
