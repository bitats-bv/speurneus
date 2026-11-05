import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { db, type Kind, type Klas } from '../data/db';
import { leesVoornamenUitCsv } from '../data/csv';
import { liveSignal } from '../data/live';
import {
  importeerKinderen,
  vergelijkNamen,
  verwijderKlas,
  voegKindToe,
  wijzigKlas,
} from '../data/klasbeheer';
import { KindAvatar } from './kind-avatar';
import { KindBewerken } from './kind-bewerken';

/** Eén klas beheren: gegevens, kinderen toevoegen, klaslijst importeren. */
@Component({
  selector: 'app-klas',
  imports: [RouterLink, KindAvatar, KindBewerken],
  template: `
    <header class="balk">
      <a routerLink="/juf" class="knop licht">← Klassen</a>
      <h1>{{ klas()?.naam ?? 'Klas' }}</h1>
      <span></span>
    </header>

    @if (geladen() && !klas()) {
      <p>Deze klas bestaat niet (meer).</p>
    }

    @if (klas(); as k) {
      <section class="kaart">
        <div class="rij kop">
          <h2>Kinderen ({{ actieveKinderen().length }})</h2>
          @if (inactieveKinderen().length) {
            <label class="vinkje klein">
              <input
                type="checkbox"
                [checked]="toonInactief()"
                (change)="toonInactief.set($any($event.target).checked)"
              />
              Toon {{ inactieveKinderen().length }} inactieve
            </label>
          }
        </div>

        <div class="kinderen">
          @for (kind of zichtbareKinderen(); track kind.id) {
            <button class="kind" [class.inactief]="!kind.actief" (click)="bewerkKind.set(kind)">
              <app-kind-avatar [kind]="kind" />
              <span>{{ kind.voornaam }}</span>
            </button>
          } @empty {
            <p class="zacht">Nog geen kinderen. Voeg ze toe of importeer een klaslijst.</p>
          }
        </div>

        <form class="rij toevoegen" (submit)="$event.preventDefault(); nieuwKind()">
          <input
            [value]="nieuweNaam()"
            (input)="nieuweNaam.set($any($event.target).value)"
            placeholder="Voornaam van een kind"
            aria-label="Voornaam van een nieuw kind"
          />
          <button class="knop" type="submit" [disabled]="!nieuweNaam().trim()">Toevoegen</button>
        </form>
      </section>

      <section class="kaart formulier">
        <h2>Klaslijst importeren</h2>
        <p class="zacht klein">
          CSV-bestand, bv. een export uit Smartschool of Excel. We nemen de kolom “Voornaam” (of
          anders de eerste kolom). Namen die al in de klas staan worden overgeslagen.
        </p>
        <label class="knop licht">
          📄 CSV-bestand kiezen
          <input type="file" accept=".csv,text/csv,text/plain" hidden (change)="leesCsv($event)" />
        </label>

        @if (importVoorstel(); as namen) {
          @if (namen.length) {
            <p>{{ namen.length }} namen gevonden:</p>
            <p class="namenlijst">{{ namen.join(', ') }}</p>
            <div class="rij">
              <button class="knop licht" (click)="importVoorstel.set(null)">Annuleren</button>
              <button class="knop" (click)="bevestigImport(namen)">Importeren</button>
            </div>
          } @else {
            <p class="fout">Geen namen gevonden in dit bestand.</p>
          }
        }
        @if (importMelding()) {
          <p>{{ importMelding() }}</p>
        }
      </section>

      <form class="kaart formulier" (submit)="$event.preventDefault(); bewaarKlas(k)">
        <h2>Klasgegevens</h2>
        <label>
          Naam
          <input [value]="klasNaam()" (input)="klasNaam.set($any($event.target).value)" required />
        </label>
        <label>
          Schooljaar
          <input [value]="klasJaar()" (input)="klasJaar.set($any($event.target).value)" required />
        </label>
        <div class="rij">
          <button type="button" class="knop gevaar" (click)="verwijder(k)">Klas verwijderen</button>
          <span class="vul"></span>
          <button
            type="submit"
            class="knop"
            [disabled]="
              !klasNaam().trim() ||
              !klasJaar().trim() ||
              (klasNaam() === k.naam && klasJaar() === k.schooljaar)
            "
          >
            Bewaren
          </button>
        </div>
      </form>
    }

    @if (bewerkKind(); as kind) {
      <app-kind-bewerken [kind]="kind" (klaar)="bewerkKind.set(null)" />
    }
  `,
  styleUrl: './klas.scss',
})
export class KlasPage {
  /** Uit de route (`/juf/klas/:id`). */
  readonly id = input.required<string>();

  private readonly router = inject(Router);

  private readonly data = liveSignal<string, { geladen: boolean; klas?: Klas; kinderen: Kind[] }>(
    () => this.id(),
    async (id) => {
      const [klas, kinderen] = await Promise.all([
        db.klassen.get(id),
        db.kinderen.where('klasId').equals(id).toArray(),
      ]);
      kinderen.sort((a, b) => vergelijkNamen(a.voornaam, b.voornaam));
      return { geladen: true, klas, kinderen };
    },
    { geladen: false, kinderen: [] },
  );

  protected readonly geladen = computed(() => this.data().geladen);
  protected readonly klas = computed(() => this.data().klas);
  protected readonly actieveKinderen = computed(() => this.data().kinderen.filter((k) => k.actief));
  protected readonly inactieveKinderen = computed(() =>
    this.data().kinderen.filter((k) => !k.actief),
  );
  protected readonly toonInactief = signal(false);
  protected readonly zichtbareKinderen = computed(() =>
    this.toonInactief() ? this.data().kinderen : this.actieveKinderen(),
  );

  protected readonly nieuweNaam = signal('');
  protected readonly bewerkKind = signal<Kind | null>(null);
  protected readonly importVoorstel = signal<string[] | null>(null);
  protected readonly importMelding = signal('');

  protected readonly klasNaam = linkedSignal(() => this.klas()?.naam ?? '');
  protected readonly klasJaar = linkedSignal(() => this.klas()?.schooljaar ?? '');

  protected async nieuwKind(): Promise<void> {
    const naam = this.nieuweNaam().trim();
    if (!naam) return;
    const { toegevoegd } = await importeerKinderen(this.id(), [naam]);
    this.importMelding.set('');
    if (toegevoegd.length === 0) {
      if (!confirm(`Er zit al een ${naam} in de klas. Toch nog een ${naam} toevoegen?`)) return;
      await voegKindToe(this.id(), naam);
    }
    this.nieuweNaam.set('');
  }

  protected async leesCsv(event: Event): Promise<void> {
    const invoer = event.target as HTMLInputElement;
    const bestand = invoer.files?.[0];
    invoer.value = '';
    if (!bestand) return;
    this.importMelding.set('');
    this.importVoorstel.set(leesVoornamenUitCsv(await bestand.text()));
  }

  protected async bevestigImport(namen: string[]): Promise<void> {
    const { toegevoegd, overgeslagen } = await importeerKinderen(this.id(), namen);
    this.importVoorstel.set(null);
    this.importMelding.set(
      `${toegevoegd.length} kinderen toegevoegd.` +
        (overgeslagen.length ? ` Overgeslagen (stonden er al): ${overgeslagen.join(', ')}.` : ''),
    );
  }

  protected async bewaarKlas(klas: Klas): Promise<void> {
    await wijzigKlas(klas.id, { naam: this.klasNaam().trim(), schooljaar: this.klasJaar().trim() });
  }

  protected async verwijder(klas: Klas): Promise<void> {
    const vraag =
      `Klas “${klas.naam}” verwijderen?\n\n` +
      `Alle ${this.data().kinderen.length} kinderen, hun foto's en al hun resultaten ` +
      `worden definitief gewist. Dit kan niet ongedaan gemaakt worden.`;
    if (!confirm(vraag)) return;
    await verwijderKlas(klas.id);
    await this.router.navigate(['/juf']);
  }
}
