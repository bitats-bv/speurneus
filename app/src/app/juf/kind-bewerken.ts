import {
  Component,
  ElementRef,
  afterNextRender,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { Kind } from '../data/db';
import { verkleinFoto } from '../data/foto';
import { AVATARS, aantalAntwoorden, verwijderKind, wijzigKind } from '../data/klasbeheer';
import { normaliseerNaam } from '../data/csv';
import { KindAvatar } from './kind-avatar';

/** Dialoog om één kind te bewerken: naam, foto of avatar, actief, verwijderen. */
@Component({
  selector: 'app-kind-bewerken',
  imports: [KindAvatar],
  template: `
    <dialog #dialoog (close)="klaar.emit()">
      <form method="dialog" class="formulier" (submit)="$event.preventDefault(); bewaar()">
        <div class="voorbeeld">
          <app-kind-avatar [kind]="{ foto: foto(), avatar: avatar() }" style="--maat: 7rem" />
        </div>

        <label>
          Voornaam
          <input [value]="voornaam()" (input)="voornaam.set($any($event.target).value)" required />
        </label>

        <fieldset>
          <legend>Foto</legend>
          <p class="zacht klein">
            Enkel met toestemming van de ouders. De foto blijft op deze iPad.
          </p>
          <div class="rij">
            <label class="knop licht">
              📷 Foto nemen of kiezen
              <input
                type="file"
                accept="image/*"
                capture="user"
                hidden
                (change)="kiesFoto($event)"
              />
            </label>
            @if (foto()) {
              <button type="button" class="knop licht" (click)="foto.set(undefined)">
                Foto weghalen
              </button>
            }
          </div>
          @if (fotoFout()) {
            <p class="fout">{{ fotoFout() }}</p>
          }
        </fieldset>

        <fieldset>
          <legend>Avatar {{ foto() ? '(wordt gebruikt zonder foto)' : '' }}</legend>
          <div class="avatars">
            @for (a of avatars; track a) {
              <button
                type="button"
                class="avatar"
                [class.gekozen]="a === avatar()"
                (click)="avatar.set(a)"
                [attr.aria-label]="'Avatar ' + a"
              >
                {{ a }}
              </button>
            }
          </div>
        </fieldset>

        <label class="vinkje">
          <input
            type="checkbox"
            [checked]="actief()"
            (change)="actief.set($any($event.target).checked)"
          />
          Zit nog in de klas (inactieve kinderen verschijnen niet in het spel)
        </label>

        <div class="rij acties">
          <button type="button" class="knop gevaar" (click)="verwijder()">Verwijderen</button>
          <span class="vul"></span>
          <button type="button" class="knop licht" (click)="sluit()">Annuleren</button>
          <button type="submit" class="knop" [disabled]="!voornaam().trim()">Bewaren</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    dialog {
      border: none;
      border-radius: 1.5rem;
      padding: 1.5rem;
      width: min(36rem, calc(100vw - 2rem));
      max-height: calc(100dvh - 2rem);
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 0.4);
    }
    .voorbeeld {
      display: flex;
      justify-content: center;
    }
    fieldset {
      border: 1px solid #ddd;
      border-radius: 1rem;
      text-align: left;
    }
    .avatars {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(3.2rem, 1fr));
      gap: 0.4rem;
    }
    .avatar {
      font-size: 2rem;
      padding: 0.3rem;
      border-radius: 0.8rem;
      border: 3px solid transparent;
      background: #f6f6f6;
    }
    .avatar.gekozen {
      border-color: #ff6600;
      background: #fff4cc;
    }
    .acties {
      margin-top: 0.5rem;
    }
    .vul {
      flex: 1;
    }
  `,
})
export class KindBewerken {
  readonly kind = input.required<Kind>();
  readonly klaar = output<void>();

  protected readonly avatars = AVATARS;
  protected readonly voornaam = linkedSignal(() => this.kind().voornaam);
  protected readonly foto = linkedSignal<Blob | undefined>(() => this.kind().foto);
  protected readonly avatar = linkedSignal(() => this.kind().avatar ?? AVATARS[0]);
  protected readonly actief = linkedSignal(() => this.kind().actief);
  protected readonly fotoFout = signal('');

  private readonly dialoog = viewChild.required<ElementRef<HTMLDialogElement>>('dialoog');

  constructor() {
    afterNextRender(() => this.dialoog().nativeElement.showModal());
  }

  protected async kiesFoto(event: Event): Promise<void> {
    const invoer = event.target as HTMLInputElement;
    const bestand = invoer.files?.[0];
    invoer.value = '';
    if (!bestand) return;
    this.fotoFout.set('');
    try {
      this.foto.set(await verkleinFoto(bestand));
    } catch {
      this.fotoFout.set('Deze foto kon niet gelezen worden. Probeer een andere.');
    }
  }

  protected async bewaar(): Promise<void> {
    const naam = normaliseerNaam(this.voornaam());
    if (!naam) return;
    await wijzigKind(this.kind().id, {
      voornaam: naam,
      foto: this.foto(),
      avatar: this.avatar(),
      actief: this.actief(),
    });
    this.sluit();
  }

  protected async verwijder(): Promise<void> {
    const kind = this.kind();
    const aantal = await aantalAntwoorden(kind.id);
    const uitleg =
      aantal > 0
        ? `${kind.voornaam} heeft al ${aantal} antwoorden. Die worden ook gewist.\n` +
          `Wil je de resultaten bewaren? Zet het kind dan op inactief.\n\n`
        : '';
    if (!confirm(`${uitleg}${kind.voornaam} definitief verwijderen?`)) return;
    await verwijderKind(kind.id);
    this.sluit();
  }

  protected sluit(): void {
    this.dialoog().nativeElement.close();
  }
}
