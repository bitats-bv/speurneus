import { Component, computed, linkedSignal, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { db } from '../data/db';
import { liveSignal } from '../data/live';
import { vergelijkNamen } from '../data/klasbeheer';
import { KindAvatar } from '../juf/kind-avatar';
import { laadAlleThemas, type ThemaPakket } from '../spel/themapakket';
import { maakOverzicht, type KindOverzicht } from './overzicht';

/** Juf-scherm: per kind hoeveel juist, en per sessie elk antwoord. Nooit in kind-modus tonen. */
@Component({
  selector: 'app-resultaten',
  imports: [RouterLink, DatePipe, KindAvatar],
  templateUrl: './resultaten.html',
  styleUrl: './resultaten.scss',
})
export class ResultatenPage {
  protected readonly klassen = liveSignal(
    async () => (await db.klassen.toArray()).sort((a, b) => vergelijkNamen(a.naam, b.naam)),
    [],
  );
  protected readonly themas = signal<ThemaPakket[]>([]);

  protected readonly klasId = linkedSignal(() => this.klassen()[0]?.id ?? null);
  /** null = alle thema's */
  protected readonly themaId = signal<string | null>(null);
  protected readonly open = signal<string | null>(null);

  protected readonly overzicht = liveSignal<
    { klasId: string | null; themaId: string | null },
    KindOverzicht[]
  >(
    () => ({ klasId: this.klasId(), themaId: this.themaId() }),
    async ({ klasId, themaId }) => {
      if (!klasId) return [];
      const kinderen = (await db.kinderen.where('klasId').equals(klasId).toArray()).sort((a, b) =>
        vergelijkNamen(a.voornaam, b.voornaam),
      );
      const ids = kinderen.map((k) => k.id);
      let [sessies, antwoorden] = await Promise.all([
        db.sessies.where('kindId').anyOf(ids).toArray(),
        db.antwoorden.where('kindId').anyOf(ids).toArray(),
      ]);
      if (themaId) {
        sessies = sessies.filter((s) => s.themaId === themaId);
        antwoorden = antwoorden.filter((a) => a.themaId === themaId);
      }
      return maakOverzicht(kinderen, sessies, antwoorden);
    },
    [],
  );

  private readonly pakketten = computed(() => new Map(this.themas().map((t) => [t.id, t])));

  constructor() {
    laadAlleThemas().then(
      (t) => this.themas.set(t),
      (e) => console.error(e),
    );
  }

  protected themaNaam(id: string): string {
    return this.pakketten().get(id)?.naam ?? id;
  }

  protected vraagTekst(themaId: string, vraagId: string): string {
    return (
      this.pakketten()
        .get(themaId)
        ?.vragen.find((v) => v.id === vraagId)?.vraagTekst ?? vraagId
    );
  }

  protected afbeelding(themaId: string, optieId: string): string | undefined {
    return this.pakketten()
      .get(themaId)
      ?.antwoordopties.find((o) => o.id === optieId)?.afbeelding;
  }

  protected wissel(kindId: string): void {
    this.open.update((huidig) => (huidig === kindId ? null : kindId));
  }
}
