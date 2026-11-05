import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { db } from '../data/db';
import { liveSignal } from '../data/live';
import { vergelijkNamen } from '../data/klasbeheer';
import { KindAvatar } from '../juf/kind-avatar';
import { SpelInstellingenService } from './spel-instellingen';

/** Kind-modus: elk kind tikt op zijn eigen foto om te beginnen. */
@Component({
  selector: 'app-kindkeuze',
  imports: [RouterLink, KindAvatar],
  template: `
    <a routerLink="/spel" class="juf" aria-label="Terug naar juf">⚙︎</a>
    <h1>Wie ben jij?</h1>
    <div class="rooster">
      @for (kind of kinderen(); track kind.id) {
        <button class="kind" [class.gespeeld]="kind.gespeeld" (click)="kies(kind.id)">
          <app-kind-avatar [kind]="kind" />
          <span>{{ kind.voornaam }}</span>
          @if (kind.gespeeld) {
            <span class="ster" aria-hidden="true">⭐</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    .juf {
      position: fixed;
      top: calc(env(safe-area-inset-top) + 0.5rem);
      right: 0.75rem;
      font-size: 1.4rem;
      color: #aaa;
      text-decoration: none;
      padding: 0.5rem;
    }
    .rooster {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
      gap: 1.25rem;
      max-width: 64rem;
      margin: 0 auto;
    }
    .kind {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      font: inherit;
      font-size: 1.2rem;
      font-weight: 600;
      color: #333;
      padding: 1rem;
      border: none;
      border-radius: 1.5rem;
      background: #fff;
      cursor: pointer;
      box-shadow: 0 2px 8px rgb(0 0 0 / 0.08);
      --maat: 8rem;
      transition: transform 0.15s;
    }
    .kind:active {
      transform: scale(0.95);
    }
    .gespeeld {
      opacity: 0.55;
    }
    .ster {
      position: absolute;
      top: 0.4rem;
      right: 0.6rem;
      font-size: 1.8rem;
    }
  `,
})
export class KindkeuzePage {
  private readonly router = inject(Router);
  private readonly instellingen = inject(SpelInstellingenService).huidig;

  protected readonly kinderen = liveSignal(
    () => this.instellingen(),
    async (inst) => {
      if (!inst) return [];
      const kinderen = await db.kinderen.where('klasId').equals(inst.klasId).toArray();
      const vandaag = new Date().setHours(0, 0, 0, 0);
      const sessies = await db.sessies.where('start').aboveOrEqual(vandaag).toArray();
      const gespeeld = new Set(
        sessies
          .filter((s) => s.themaId === inst.themaId && s.status === 'klaar')
          .map((s) => s.kindId),
      );
      return kinderen
        .filter((k) => k.actief)
        .sort((a, b) => vergelijkNamen(a.voornaam, b.voornaam))
        .map((k) => ({ ...k, gespeeld: gespeeld.has(k.id) }));
    },
    [],
  );

  constructor() {
    if (!this.instellingen()) void this.router.navigate(['/spel']);
  }

  protected kies(kindId: string): void {
    void this.router.navigate(['/spel/speel', kindId]);
  }
}
