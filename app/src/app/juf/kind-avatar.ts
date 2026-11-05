import { Component, computed, effect, input } from '@angular/core';
import type { Kind } from '../data/db';

/** Toont de foto van een kind, of anders zijn avatar. */
@Component({
  selector: 'app-kind-avatar',
  template: `
    @if (fotoUrl(); as url) {
      <img [src]="url" alt="" />
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
    .emoji {
      font-size: calc(var(--maat, 5rem) * 0.6);
      line-height: 1;
    }
  `,
})
export class KindAvatar {
  readonly kind = input.required<Pick<Kind, 'foto' | 'avatar'>>();

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
