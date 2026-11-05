import { Component, computed, input, signal, type OnDestroy, type OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Opname } from '../data/db';
import { liveSignal } from '../data/live';
import { bewaarOpname, opnamesVoorThema, wisOpname } from '../data/opnames';
import * as stem from '../spel/stem';
import { laadThema, type PakketVraag, type ThemaPakket } from '../spel/themapakket';
import { MAX_OPNAME_MS, Recorder, type OpnameResultaat } from './recorder';

type Status = 'eigen' | 'pakket' | 'computer';

/** Per vraag van een thema: opnemen, beluisteren, opnieuw, wissen. */
@Component({
  selector: 'app-stem-thema',
  imports: [RouterLink],
  templateUrl: './stem-thema.html',
  styleUrl: './stem-thema.scss',
})
export class StemThemaPage implements OnInit, OnDestroy {
  readonly themaId = input.required<string>();

  protected readonly thema = signal<ThemaPakket | null>(null);
  protected readonly laadFout = signal(false);
  protected readonly opnames = liveSignal(
    () => this.themaId(),
    (id) => opnamesVoorThema(id),
    new Map<string, Opname>(),
  );

  /** Vraag die nu opgenomen wordt, of null. */
  protected readonly neemtOp = signal<string | null>(null);
  protected readonly seconden = signal(0);
  /** Sleutel van wat nu afspeelt (`vraagId` of `vraagId:computer`), of null. */
  protected readonly speelt = signal<string | null>(null);
  protected readonly melding = signal<string | null>(null);
  protected readonly maxSeconden = MAX_OPNAME_MS / 1000;
  protected readonly bezig = computed(() => this.neemtOp() !== null);

  private readonly recorder = new Recorder((r) => void this.naOpname(r));
  private teller?: ReturnType<typeof setInterval>;
  private url: string | null = null;

  async ngOnInit(): Promise<void> {
    try {
      this.thema.set(await laadThema(this.themaId()));
    } catch (e) {
      console.error(e);
      this.laadFout.set(true);
    }
  }

  ngOnDestroy(): void {
    // Wegnavigeren stopt een lopende opname zonder te bewaren.
    this.recorder.annuleer();
    clearInterval(this.teller);
    stem.stop();
    this.ruimUrlOp();
  }

  protected status(vraag: PakketVraag): Status {
    if (this.opnames().has(vraag.id)) return 'eigen';
    return vraag.vraagAudio ? 'pakket' : 'computer';
  }

  /** Tik start, tik opnieuw stopt en bewaart. */
  protected async opnemen(vraag: PakketVraag): Promise<void> {
    if (this.neemtOp() === vraag.id) {
      await this.naOpname(await this.recorder.stop());
      return;
    }
    if (this.bezig()) return;
    this.stopAfspelen();
    this.melding.set(null);
    try {
      await this.recorder.start();
    } catch (e) {
      this.melding.set((e as Error).message);
      return;
    }
    this.neemtOp.set(vraag.id);
    this.seconden.set(0);
    const begin = Date.now();
    this.teller = setInterval(
      () => this.seconden.set(Math.floor((Date.now() - begin) / 1000)),
      250,
    );
  }

  protected async beluister(vraag: PakketVraag): Promise<void> {
    const opname = this.opnames().get(vraag.id);
    if (this.bezig()) return;
    this.stopAfspelen();
    this.url = opname ? URL.createObjectURL(opname.audio) : null;
    await this.speel(vraag.id, vraag.vraagTekst, this.url ?? vraag.vraagAudio);
  }

  protected async computerstem(vraag: PakketVraag): Promise<void> {
    if (this.bezig()) return;
    this.stopAfspelen();
    await this.speel(`${vraag.id}:computer`, vraag.vraagTekst, null);
  }

  protected async wis(vraag: PakketVraag): Promise<void> {
    if (this.bezig()) return;
    if (!confirm(`Opname van "${vraag.vraagTekst}" wissen?`)) return;
    this.stopAfspelen();
    await wisOpname(this.themaId(), vraag.id);
  }

  private async naOpname(r: OpnameResultaat | null): Promise<void> {
    const vraagId = this.neemtOp();
    clearInterval(this.teller);
    this.neemtOp.set(null);
    if (!vraagId) return;
    if (!r) {
      this.melding.set('Die opname was te kort. Tik op opnemen, spreek, en tik dan opnieuw.');
      return;
    }
    await bewaarOpname(this.themaId(), vraagId, r.blob, r.mimeType, r.duurMs);
  }

  private async speel(sleutel: string, tekst: string, url: string | null): Promise<void> {
    this.speelt.set(sleutel);
    await stem.speel(tekst, url);
    if (this.speelt() === sleutel) this.speelt.set(null);
  }

  private stopAfspelen(): void {
    stem.stop();
    this.speelt.set(null);
    this.ruimUrlOp();
  }

  private ruimUrlOp(): void {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }
}
