import { db } from './db';
import {
  huidigSchooljaar,
  importeerKinderen,
  maakKlas,
  verwijderKind,
  verwijderKlas,
  voegKindToe,
} from './klasbeheer';

describe('klasbeheer', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('berekent het schooljaar vanaf september', () => {
    expect(huidigSchooljaar(new Date(2026, 8, 1))).toBe('2026-2027');
    expect(huidigSchooljaar(new Date(2027, 5, 30))).toBe('2026-2027');
  });

  it('importeert enkel nieuwe namen en geeft elk kind een avatar', async () => {
    const klas = await maakKlas('  Vlinders ', '2026-2027');
    expect(klas.naam).toBe('Vlinders');
    await voegKindToe(klas.id, 'Lotte');

    const r = await importeerKinderen(klas.id, ['lotte', 'Noah', 'Noah', ' ', 'Mila']);
    expect(r.toegevoegd).toEqual(['Noah', 'Mila']);
    expect(r.overgeslagen).toEqual(['lotte', 'Noah']);

    const kinderen = await db.kinderen.where('klasId').equals(klas.id).toArray();
    expect(kinderen).toHaveLength(3);
    expect(kinderen.every((k) => k.avatar && k.actief)).toBe(true);
  });

  it('verwijdert een kind met zijn sessies en antwoorden', async () => {
    const klas = await maakKlas('Vlinders', '2026-2027');
    const lotte = await voegKindToe(klas.id, 'Lotte');
    const noah = await voegKindToe(klas.id, 'Noah');
    await zetAntwoord(lotte.id, 'a1');
    await zetAntwoord(noah.id, 'a2');

    await verwijderKind(lotte.id);

    expect(await db.kinderen.get(lotte.id)).toBeUndefined();
    expect(await db.antwoorden.where('kindId').equals(lotte.id).count()).toBe(0);
    expect(await db.sessies.where('kindId').equals(lotte.id).count()).toBe(0);
    expect(await db.antwoorden.where('kindId').equals(noah.id).count()).toBe(1);
  });

  it('verwijdert een klas met alles erop en eraan, maar laat andere klassen staan', async () => {
    const a = await maakKlas('A', '2026-2027');
    const b = await maakKlas('B', '2026-2027');
    const kindA = await voegKindToe(a.id, 'Lotte');
    const kindB = await voegKindToe(b.id, 'Noah');
    await zetAntwoord(kindA.id, 'a1');
    await zetAntwoord(kindB.id, 'a2');
    await db.periodes.add({
      id: 'p1',
      klasId: a.id,
      naam: 'P1',
      startdatum: '2026-09-01',
      einddatum: '2026-10-31',
    });

    await verwijderKlas(a.id);

    expect(await db.klassen.count()).toBe(1);
    expect(await db.kinderen.toArray()).toEqual([expect.objectContaining({ id: kindB.id })]);
    expect(await db.periodes.count()).toBe(0);
    expect(await db.antwoorden.toArray()).toEqual([expect.objectContaining({ kindId: kindB.id })]);
  });
});

async function zetAntwoord(kindId: string, id: string): Promise<void> {
  await db.sessies.add({
    id: `s-${id}`,
    kindId,
    themaId: 't',
    aantalOpties: 3,
    aantalVragen: 1,
    start: 0,
    status: 'klaar',
  });
  await db.antwoorden.add({
    id,
    sessieId: `s-${id}`,
    kindId,
    themaId: 't',
    vraagId: 'v',
    gekozenOptieId: 'o',
    juist: true,
    tijdstip: 0,
  });
}
