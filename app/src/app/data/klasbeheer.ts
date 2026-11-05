import { db, type Kind, type Klas } from './db';
import { nieuwId } from './id';
import { normaliseerNaam } from './csv';

/** Kindvriendelijke avatars voor kinderen zonder foto. */
export const AVATARS = [
  '🐶',
  '🐱',
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🐯',
  '🦁',
  '🐸',
  '🐵',
  '🐰',
  '🐷',
  '🐮',
  '🐔',
  '🐧',
  '🐢',
  '🐙',
  '🦄',
  '🐝',
  '🦋',
  '🐞',
  '🐳',
  '🦒',
  '🦓',
  '🐘',
  '🦉',
  '🐿️',
  '🦔',
  '🐬',
  '🦕',
];

/** Huidig schooljaar: vanaf september telt het nieuwe jaar. */
export function huidigSchooljaar(datum = new Date()): string {
  const jaar = datum.getFullYear();
  const start = datum.getMonth() >= 8 ? jaar : jaar - 1;
  return `${start}-${start + 1}`;
}

export function vergelijkNamen(a: string, b: string): number {
  return a.localeCompare(b, 'nl', { sensitivity: 'base' });
}

// ---------- Klassen ----------

export async function maakKlas(naam: string, schooljaar: string): Promise<Klas> {
  const klas: Klas = { id: nieuwId(), naam: normaliseerNaam(naam), schooljaar: schooljaar.trim() };
  await db.klassen.add(klas);
  return klas;
}

export async function wijzigKlas(id: string, wijziging: Partial<Omit<Klas, 'id'>>): Promise<void> {
  await db.klassen.update(id, wijziging);
}

/** Verwijdert de klas met álle kinderen, periodes, sessies en antwoorden. */
export async function verwijderKlas(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.klassen, db.kinderen, db.periodes, db.sessies, db.antwoorden],
    async () => {
      const kindIds = (await db.kinderen.where('klasId').equals(id).primaryKeys()) as string[];
      await verwijderGegevensVanKinderen(kindIds);
      await db.kinderen.bulkDelete(kindIds);
      await db.periodes.where('klasId').equals(id).delete();
      await db.klassen.delete(id);
    },
  );
}

// ---------- Kinderen ----------

export async function voegKindToe(
  klasId: string,
  voornaam: string,
  extra: Pick<Kind, 'avatar' | 'foto'> = {},
): Promise<Kind> {
  const kind: Kind = {
    id: nieuwId(),
    klasId,
    voornaam: normaliseerNaam(voornaam),
    avatar: extra.foto ? undefined : (extra.avatar ?? willekeurigeAvatar()),
    foto: extra.foto,
    actief: true,
  };
  await db.kinderen.add(kind);
  return kind;
}

export async function wijzigKind(id: string, wijziging: Partial<Omit<Kind, 'id'>>): Promise<void> {
  await db.kinderen.update(id, wijziging);
}

/**
 * Voegt namen toe die nog niet in de klas staan (hoofdletterongevoelig).
 * Geeft terug welke namen toegevoegd en welke overgeslagen zijn.
 */
export async function importeerKinderen(
  klasId: string,
  namen: string[],
): Promise<{ toegevoegd: string[]; overgeslagen: string[] }> {
  return db.transaction('rw', db.kinderen, async () => {
    const bestaand = await db.kinderen.where('klasId').equals(klasId).toArray();
    const gezien = new Set(bestaand.map((k) => k.voornaam.toLocaleLowerCase('nl')));
    const toegevoegd: string[] = [];
    const overgeslagen: string[] = [];
    const gebruikt = bestaand.map((k) => k.avatar).filter((a): a is string => !!a);

    for (const ruw of namen) {
      const naam = normaliseerNaam(ruw);
      if (!naam) continue;
      const sleutel = naam.toLocaleLowerCase('nl');
      if (gezien.has(sleutel)) {
        overgeslagen.push(naam);
        continue;
      }
      gezien.add(sleutel);
      const avatar = willekeurigeAvatar(gebruikt);
      gebruikt.push(avatar);
      await db.kinderen.add({ id: nieuwId(), klasId, voornaam: naam, avatar, actief: true });
      toegevoegd.push(naam);
    }
    return { toegevoegd, overgeslagen };
  });
}

/** Verwijdert een kind definitief, samen met al zijn spelsessies en antwoorden. */
export async function verwijderKind(id: string): Promise<void> {
  await db.transaction('rw', [db.kinderen, db.sessies, db.antwoorden], async () => {
    await verwijderGegevensVanKinderen([id]);
    await db.kinderen.delete(id);
  });
}

export async function aantalAntwoorden(kindId: string): Promise<number> {
  return db.antwoorden.where('kindId').equals(kindId).count();
}

async function verwijderGegevensVanKinderen(kindIds: string[]): Promise<void> {
  if (kindIds.length === 0) return;
  await db.sessies.where('kindId').anyOf(kindIds).delete();
  await db.antwoorden.where('kindId').anyOf(kindIds).delete();
}

/** Kiest bij voorkeur een avatar die nog niet gebruikt wordt. */
export function willekeurigeAvatar(gebruikt: readonly string[] = []): string {
  const vrij = AVATARS.filter((a) => !gebruikt.includes(a));
  const pool = vrij.length > 0 ? vrij : AVATARS;
  return pool[Math.floor(Math.random() * pool.length)];
}
