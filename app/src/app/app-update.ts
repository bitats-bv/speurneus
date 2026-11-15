import { DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * Schermen waar een herlaad niets kapotmaakt: geen lopend spel, geen opname,
 * geen half ingevuld formulier. Enkel hier laden we een nieuwe versie meteen.
 */
const RUSTIGE_SCHERMEN = ['/', '/spel', '/spel/kinderen', '/juf', '/resultaten'];

/** Mag de app op deze url herladen worden zonder dat iemand iets verliest? */
export function isRustigScherm(url: string): boolean {
  const pad = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return RUSTIGE_SCHERMEN.includes(pad);
}

/**
 * Houdt de beginscherm-app op de iPad up-to-date.
 *
 * iOS houdt een beginscherm-app vaak dagen in het geheugen; ze start dan niet opnieuw
 * en ziet een nieuwe deploy nooit. Daarom kijken we bij het opstarten én telkens de app
 * terug zichtbaar wordt of er een nieuwe versie is. Is die binnen, dan herladen we
 * meteen op een rustig scherm, of anders zodra de juf of het kind er een bereikt.
 * Een lopend spel van een kleuter wordt dus nooit onderbroken.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdate {
  private readonly sw = inject(SwUpdate);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private nieuweVersieKlaar = false;

  start(): void {
    if (!this.sw.isEnabled) return;

    const versies = this.sw.versionUpdates
      .pipe(filter((e) => e.type === 'VERSION_READY'))
      .subscribe(() => this.markeerKlaar());
    // Kapotte cache (bv. iOS ruimde bestanden op): enkel herladen helpt.
    const kapot = this.sw.unrecoverable.subscribe(() => this.markeerKlaar());
    const navigatie = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.herlaadAlsRustig());

    const bijTerugkeer = () => {
      if (document.visibilityState === 'visible') void this.controleer();
    };
    document.addEventListener('visibilitychange', bijTerugkeer);

    this.destroyRef.onDestroy(() => {
      versies.unsubscribe();
      kapot.unsubscribe();
      navigatie.unsubscribe();
      document.removeEventListener('visibilitychange', bijTerugkeer);
    });

    void this.controleer();
  }

  private async controleer(): Promise<void> {
    if (this.nieuweVersieKlaar) {
      this.herlaadAlsRustig();
      return;
    }
    try {
      await this.sw.checkForUpdate();
    } catch {
      // Offline of server onbereikbaar: volgende keer opnieuw.
    }
  }

  private markeerKlaar(): void {
    this.nieuweVersieKlaar = true;
    this.herlaadAlsRustig();
  }

  private herlaadAlsRustig(): void {
    if (this.nieuweVersieKlaar && isRustigScherm(this.router.url)) {
      document.location.reload();
    }
  }
}
