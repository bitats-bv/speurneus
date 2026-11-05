import Dexie, { type EntityTable } from 'dexie';

/**
 * Lokale database op de iPad (IndexedDB via Dexie).
 * Alle kindgegevens blijven op het toestel; er gaat niets naar een server.
 * Datamodel volgens het plan van aanpak.
 */

export interface Klas {
  id: string;
  naam: string;
  schooljaar: string; // bv. "2026-2027"
}

export interface Kind {
  id: string;
  klasId: string;
  voornaam: string;
  foto?: Blob; // verkleinde JPEG, enkel met toestemming ouders
  avatar?: string; // alternatief zonder foto
  actief: boolean;
}

export interface Periode {
  id: string;
  klasId: string;
  naam: string;
  startdatum: string; // ISO-datum
  einddatum: string;
}

export interface Thema {
  id: string;
  naam: string;
  icoon?: string;
  bron: 'standaard' | 'eigen';
}

export interface Antwoordoptie {
  id: string;
  afbeelding: string | Blob;
  audio?: string | Blob;
}

export interface Vraag {
  id: string;
  themaId: string;
  vraagTekst: string;
  vraagAudio?: string | Blob;
  juistAntwoordId: string;
  antwoordopties: Antwoordoptie[];
}

export interface Spelsessie {
  id: string;
  kindId: string;
  themaId: string;
  periodeId?: string;
  aantalOpties: number;
  aantalVragen: number;
  start: number; // epoch ms
  einde?: number;
  status: 'bezig' | 'klaar' | 'onvolledig';
}

export interface Antwoord {
  id: string;
  sessieId: string;
  kindId: string;
  themaId: string;
  vraagId: string;
  gekozenOptieId: string;
  juist: boolean;
  reactietijdMs?: number;
  tijdstip: number;
}

export class SpeurneusDb extends Dexie {
  klassen!: EntityTable<Klas, 'id'>;
  kinderen!: EntityTable<Kind, 'id'>;
  periodes!: EntityTable<Periode, 'id'>;
  themas!: EntityTable<Thema, 'id'>;
  vragen!: EntityTable<Vraag, 'id'>;
  sessies!: EntityTable<Spelsessie, 'id'>;
  antwoorden!: EntityTable<Antwoord, 'id'>;

  constructor() {
    super('speurneus');
    this.version(1).stores({
      klassen: 'id',
      kinderen: 'id, klasId',
      periodes: 'id, klasId, startdatum',
      themas: 'id',
      vragen: 'id, themaId',
      sessies: 'id, kindId, themaId, periodeId, start',
      antwoorden: 'id, sessieId, kindId, themaId, [kindId+themaId]',
    });
  }
}

export const db = new SpeurneusDb();

/** Vraag Safari om de gegevens niet zelf op te ruimen. */
export async function vraagBlijvendeOpslag(): Promise<boolean> {
  return (await navigator.storage?.persist?.()) ?? false;
}
