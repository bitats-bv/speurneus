import Dexie from 'dexie';
import type { ThemaPakket } from '../spel/themapakket';
import { db, SpeurneusDb } from './db';
import { bewaarOpname, metOpnames, opnamesVoorThema, wisOpname } from './opnames';

const blob = (tekst: string) => new Blob([tekst], { type: 'audio/mp4' });

describe('opnames', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('bewaart, overschrijft en wist een opname per vraag', async () => {
    await bewaarOpname('gevoelens', 'blij', blob('eerste'), 'audio/mp4', 1200);
    await bewaarOpname('gevoelens', 'blij', blob('tweede'), 'audio/mp4', 900);
    await bewaarOpname('gevoelens', 'boos', blob('x'), 'audio/mp4', 800);
    await bewaarOpname('dieren', 'kat', blob('y'), 'audio/webm', 700);

    const gevoelens = await opnamesVoorThema('gevoelens');
    expect([...gevoelens.keys()].sort()).toEqual(['blij', 'boos']);
    expect(gevoelens.get('blij')?.duurMs).toBe(900);
    expect(await db.opnames.count()).toBe(3);

    await wisOpname('gevoelens', 'blij');
    expect([...(await opnamesVoorThema('gevoelens')).keys()]).toEqual(['boos']);
  });

  it('geeft voorrang aan eigen opname, dan pakketaudio, dan computerstem', async () => {
    const pakket: ThemaPakket = {
      id: 'gevoelens',
      naam: 'Gevoelens',
      bron: 'standaard',
      antwoordopties: [],
      vragen: [
        {
          id: 'blij',
          vraagTekst: 'Blij?',
          vraagAudio: 'themas/gevoelens/audio/blij.mp3',
          juistAntwoordId: 'blij',
        },
        {
          id: 'boos',
          vraagTekst: 'Boos?',
          vraagAudio: 'themas/gevoelens/audio/boos.mp3',
          juistAntwoordId: 'boos',
        },
        { id: 'bang', vraagTekst: 'Bang?', vraagAudio: null, juistAntwoordId: 'bang' },
      ],
    };
    await bewaarOpname('gevoelens', 'blij', blob('juf'), 'audio/mp4', 1000);

    const { pakket: nieuw, urls } = metOpnames(
      pakket,
      await opnamesVoorThema('gevoelens'),
      () => 'blob:juf-blij',
    );
    expect(nieuw.vragen.map((v) => v.vraagAudio)).toEqual([
      'blob:juf-blij',
      'themas/gevoelens/audio/boos.mp3',
      null,
    ]);
    expect(urls).toEqual(['blob:juf-blij']);
    expect(pakket.vragen[0].vraagAudio).toBe('themas/gevoelens/audio/blij.mp3');
  });

  it('behoudt bestaande gegevens bij de upgrade naar version(2)', async () => {
    const naam = 'speurneus-migratietest';
    const oud = new Dexie(naam);
    oud.version(1).stores({
      klassen: 'id',
      kinderen: 'id, klasId',
      periodes: 'id, klasId, startdatum',
      themas: 'id',
      vragen: 'id, themaId',
      sessies: 'id, kindId, themaId, periodeId, start',
      antwoorden: 'id, sessieId, kindId, themaId, [kindId+themaId]',
    });
    await oud.table('klassen').add({ id: 'k1', naam: 'Vlinders', schooljaar: '2026-2027' });
    oud.close();

    const nieuw = new SpeurneusDb(naam);
    expect((await nieuw.klassen.get('k1'))?.naam).toBe('Vlinders');
    await nieuw.opnames.put({
      id: 'gevoelens/blij',
      themaId: 'gevoelens',
      vraagId: 'blij',
      audio: blob('z'),
      mimeType: 'audio/mp4',
      duurMs: 500,
      opgenomen: 1,
    });
    expect(await nieuw.opnames.count()).toBe(1);
    await nieuw.delete();
  });
});
