import { Component, computed, effect, input } from '@angular/core';
import type { Kind } from '../data/db';
import { isKlassymbool } from '../data/klasbeheer';

/** Toont de foto van een kind, of anders het klassymbool of de emoji-avatar. */
@Component({
  selector: 'app-kind-avatar',
  template: `
    @if (fotoUrl(); as url) {
      <img [src]="url" alt="" />
    } @else if (symbool(); as pad) {
      <img class="symbool" [src]="pad" alt="" draggable="false" />
    } @else {
      <span class="emoji" aria-hidden="true">{{ kind().avatar ?? '🙂' }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--maat, 5rem);
      height: var(--maat, 5rem);
      border-radius: 50%;
      overflow: hidden;
      background: #fff4cc;
      flex-shrink: 0;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    img.symbool {
      object-fit: contain;
      padding: 12%;
      box-sizing: border-box;
      background: #fff;
    }
    .emoji {
      font-size: calc(var(--maat, 5rem) * 0.6);
      line-height: 1;
    }
  `,
})
export class KindAvatar {
  readonly kind = input.required<Pick<Kind, 'foto' | 'avatar'>>();

  protected readonly symbool = computed(() => {
    const avatar = this.kind().avatar;
    return isKlassymbool(avatar) ? avatar : null;
  });

  protected readonly fotoUrl = computed(() => {
    const foto = this.kind().foto;
    return foto ? URL.createObjectURL(foto) : null;
  });

  constructor() {
    effect((onCleanup) => {
      const url = this.fotoUrl();
      onCleanup(() => {
        if (url) URL.revokeObjectURL(url);
      });
    });
  }
}
