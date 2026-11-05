import { db } from './db';
import { maakKlas, voegKindToe } from './klasbeheer';
import { bewaarAntwoord, isoDatum, periodeOp, sluitSessie, startSessie } from './spelsessies';

describe('spelsessies', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  async function nieuweSessie() {
    const klas = await maakKlas('Vlinders', '2026-2027');
    const kind = await voegKindToe(klas.id, 'Lotte');
    const sessie = await startSessie({
      kindId: kind.id,
      klasId: klas.id,
      themaId: 'gevoelens',
      aantalOpties: 2,
      aantalVragen: 4,
    });
    return { klas, kind, sessie };
  }

  it('koppelt de sessie aan de lopende periode', async () => {
    const klas = await maakKlas('Vlinders', '2026-2027');
    const vandaag = isoDatum();
    await db.periodes.add({
      id: 'p1',
      klasId: klas.id,
      naam: 'Herfst',
      startdatum: vandaag,
      einddatum: vandaag,
    });
    expect((await periodeOp(klas.id))?.id).toBe('p1');

    const kind = await voegKindToe(klas.id, 'Noah');
    const sessie = await startSessie({
      kindId: kind.id,
      klasId: klas.id,
      themaId: 'gevoelens',
      aantalOpties: 3,
      aantalVragen: 5,
    });
    expect(sessie.periodeId).toBe('p1');
    expect(sessie.status).toBe('bezig');
  });

  it('bewaart een antwoord met juist/fout', async () => {
    const { sessie, kind } = await nieuweSessie();
    const a = await bewaarAntwoord({
      sessie,
      vraagNr: 0,
      vraagId: 'blij',
      gekozenOptieId: 'boos',
      juistAntwoordId: 'blij',
      reactietijdMs: 1200,
    });
    expect(a.juist).toBe(false);
    expect(a.kindId).toBe(kind.id);
    expect(await db.antwoorden.where('sessieId').equals(sessie.id).count()).toBe(1);
  });

  it('laat maar één poging per vraag toe', async () => {
    const { sessie } = await nieuweSessie();
    const basis = { sessie, vraagNr: 0, vraagId: 'blij', juistAntwoordId: 'blij' };
    await bewaarAntwoord({ ...basis, gekozenOptieId: 'boos' });
    const tweede = await bewaarAntwoord({ ...basis, gekozenOptieId: 'blij' });

    expect(tweede.gekozenOptieId).toBe('boos');
    expect(tweede.juist).toBe(false);
    expect(await db.antwoorden.count()).toBe(1);
  });

  it('sluit een sessie af', async () => {
    const { sessie } = await nieuweSessie();
    await sluitSessie(sessie.id, 'klaar');
    const opgeslagen = await db.sessies.get(sessie.id);
    expect(opgeslagen?.status).toBe('klaar');
    expect(opgeslagen?.einde).toBeGreaterThan(0);
  });
});
