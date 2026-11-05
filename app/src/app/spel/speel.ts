import {
  Component,
  computed,
  inject,
  input,
  signal,
  type OnDestroy,
  type OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { db, type Kind, type Spelsessie } from '../data/db';
import { metOpnames, opnamesVoorThema } from '../data/opnames';
import { bewaarAntwoord, sluitSessie, startSessie } from '../data/spelsessies';
import { KindAvatar } from '../juf/kind-avatar';
import { SpelInstellingenService } from './spel-instellingen';
import { maakRondes, type Ronde } from './spelopbouw';
import * as stem from './stem';
import { laadThema } from './themapakket';

type Fase = 'laden' | 'start' | 'vraag' | 'antwoord' | 'klaar';

/** Executieve functies, als vaste volgorde zichtbaar tijdens elke vraag. */
export type Stap = 'luisteren' | 'kijken' | 'doen';
export const STAPPEN: { stap: Stap; icoon: string }[] = [
  { stap: 'luisteren', icoon: 'iconen/zintuigen/oor.svg' },
  { stap: 'kijken', icoon: 'iconen/zintuigen/oog.svg' },
  { stap: 'doen', icoon: 'iconen/zintuigen/handen.svg' },
];

/** Hoe lang 'kijken' oplicht voor 'doen' aan de beurt is. Tikken mag altijd. */
const KIJKEN_MS = 1500;

/** Pauze na een tik voor de volgende vraag komt (animaties blijven < 1 s). */
const PAUZE_MS = 900;

/** Eén kind speelt: audiovraag, tikken op een afbeelding, één poging per vraag. */
@Component({
  selector: 'app-speel',
  imports: [KindAvatar],
  templateUrl: './speel.html',
  styleUrl: './speel.scss',
})
export class SpeelPage implements OnInit, OnDestroy {
  readonly kindId = input.required<string>();

  private readonly router = inject(Router);
  private readonly instellingen = inject(SpelInstellingenService).huidig;

  protected readonly fase = signal<Fase>('laden');
  protected readonly kind = signal<Kind | undefined>(undefined);
  protected readonly rondes = signal<Ronde[]>([]);
  protected readonly nr = signal(0);
  protected readonly gekozen = signal<string | null>(null);
  protected readonly ronde = computed(() => this.rondes()[this.nr()]);
  protected readonly stappen = STAPPEN;
  protected readonly stap = signal<Stap>('luisteren');

  private sessie?: Spelsessie;
  private vraagStart = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private stapTimer?: ReturnType<typeof setTimeout>;
  /** Object-URL's van de juf-opnames, op te ruimen bij het verlaten. */
  private opnameUrls: string[] = [];

  async ngOnInit(): Promise<void> {
    const inst = this.instellingen();
    const kind = await db.kinderen.get(this.kindId());
    if (!inst || !kind || kind.klasId !== inst.klasId) {
      void this.router.navigate([inst ? '/spel/kinderen' : '/spel']);
      return;
    }
    // Voorrang voor de vraag: eigen opname van de juf → pakketaudio → computerstem.
    const [pakket, opnames] = await Promise.all([
      laadThema(inst.themaId),
      opnamesVoorThema(inst.themaId),
    ]);
    const { pakket: thema, urls } = metOpnames(pakket, opnames);
    this.opnameUrls = urls;
    this.kind.set(kind);
    this.rondes.set(maakRondes(thema, inst.aantalOpties, inst.aantalVragen));
    this.fase.set('start');
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    clearTimeout(this.stapTimer);
    stem.stop();
    this.opnameUrls.forEach((u) => URL.revokeObjectURL(u));
    this.opnameUrls = [];
    if (this.sessie && this.fase() !== 'klaar') void sluitSessie(this.sessie.id, 'onvolledig');
  }

  /** Eerste tik: ontgrendelt geluid op iOS en start de sessie. */
  protected async begin(): Promise<void> {
    if (this.fase() !== 'start') return;
    stem.ontgrendel();
    const inst = this.instellingen()!;
    this.fase.set('laden');
    this.sessie = await startSessie({
      kindId: this.kindId(),
      klasId: inst.klasId,
      themaId: inst.themaId,
      aantalOpties: inst.aantalOpties,
      aantalVragen: this.rondes().length,
    });
    this.toonVraag(0);
  }

  /** Speelt de vraag (opnieuw): eerst luisteren, daarna kijken, dan doen. */
  protected async herhaal(): Promise<void> {
    const r = this.ronde();
    if (!r || this.fase() !== 'vraag') return;
    clearTimeout(this.stapTimer);
    this.stap.set('luisteren');
    const uitgespeeld = await stem.speel(r.vraag.vraagTekst, r.vraag.vraagAudio);
    if (!uitgespeeld || this.fase() !== 'vraag') return;
    this.stap.set('kijken');
    this.stapTimer = setTimeout(() => {
      if (this.fase() === 'vraag') this.stap.set('doen');
    }, KIJKEN_MS);
  }

  protected async kies(optieId: string): Promise<void> {
    const r = this.ronde();
    if (this.fase() !== 'vraag' || !r || !this.sessie) return;
    this.fase.set('antwoord');
    this.gekozen.set(optieId);
    clearTimeout(this.stapTimer);
    this.stap.set('doen');
    stem.stop();
    await bewaarAntwoord({
      sessie: this.sessie,
      vraagNr: this.nr(),
      vraagId: r.vraag.id,
      gekozenOptieId: optieId,
      juistAntwoordId: r.vraag.juistAntwoordId,
      reactietijdMs: Date.now() - this.vraagStart,
    });
    this.timer = setTimeout(() => {
      const volgende = this.nr() + 1;
      if (volgende < this.rondes().length) this.toonVraag(volgende);
      else void this.rondAf();
    }, PAUZE_MS);
  }

  protected stoppen(): void {
    if (this.fase() === 'klaar' || confirm('Spel stoppen? Gegeven antwoorden blijven bewaard.')) {
      void this.router.navigate(['/spel/kinderen']);
    }
  }

  private toonVraag(nr: number): void {
    this.nr.set(nr);
    this.gekozen.set(null);
    this.fase.set('vraag');
    this.vraagStart = Date.now();
    void this.herhaal();
  }

  private async rondAf(): Promise<void> {
    this.fase.set('klaar');
    void stem.speel('Knap gewerkt!');
    if (this.sessie) await sluitSessie(this.sessie.id, 'klaar');
  }
}
