import { effect, signal, untracked, type Signal } from '@angular/core';
import { liveQuery } from 'dexie';

/**
 * Dexie-query als signal: wordt automatisch bijgewerkt wanneer de onderliggende tabellen
 * wijzigen. Moet in een injectiecontext aangeroepen worden (bv. een veldinitialisatie).
 *
 * `bron` mag signals (zoals component-inputs) lezen; verandert die waarde, dan wordt de
 * query opnieuw opgezet. De query zelf leest geen signals.
 */
export function liveSignal<T>(query: () => T | Promise<T>, beginwaarde: T): Signal<T>;
export function liveSignal<B, T>(
  bron: () => B,
  query: (bron: B) => T | Promise<T>,
  beginwaarde: T,
): Signal<T>;
export function liveSignal<B, T>(
  ...args: [() => T | Promise<T>, T] | [() => B, (bron: B) => T | Promise<T>, T]
): Signal<T> {
  const [bron, query, beginwaarde] =
    args.length === 2 ? [() => undefined as B, args[0] as (b: B) => T | Promise<T>, args[1]] : args;

  const waarde = signal<T>(beginwaarde);
  effect((onCleanup) => {
    const b = bron();
    const abonnement = untracked(() =>
      liveQuery(() => query(b)).subscribe({
        next: (v) => waarde.set(v),
        error: (e) => console.error('liveQuery mislukt', e),
      }),
    );
    onCleanup(() => abonnement.unsubscribe());
  });
  return waarde.asReadonly();
}
