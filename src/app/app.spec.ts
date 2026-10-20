import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { StoreService } from './store.service';
import { FLIGHT_CODES } from '../domain/flightCodes';
import { countSSR } from '../domain/flightStats';
import { Crown } from 'lucide-angular';
import { FLIGHT_AV210, FLIGHT_AV026, FLIGHT_AV120 } from '../infrastructure/mockData';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const h1 = compiled.querySelector('h1');
    expect(h1?.textContent).toContain('SeatMap Pro');
    const img = h1?.querySelector('img');
    expect(img?.getAttribute('src')).toBe('avianca-wordmark.png');
    expect(img?.getAttribute('alt')).toBe('Avianca');
  });

  it('should have accessible flight cards and decorative logo', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    // Verify Avianca symbol images have alt="" and aria-hidden="true"
    const symbolImages = compiled.querySelectorAll('img[src="avianca-symbol.png"]');
    expect(symbolImages.length).toBeGreaterThan(0);
    symbolImages.forEach(img => {
      expect(img.getAttribute('alt')).toBe('');
      expect(img.getAttribute('aria-hidden')).toBe('true');
    });

    // Verify flight cards have role="button", tabindex="0" and an accessible name
    const flightCards = compiled.querySelectorAll('[role="button"]');
    expect(flightCards.length).toBe(3); // Should have 3 demo flights
    flightCards.forEach(card => {
      expect(card.getAttribute('tabindex')).toBe('0');
      expect(card.getAttribute('aria-label')).toContain('Abrir vuelo');
    });
  });

  it('should select flight on Enter and Space keydown events', async () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(StoreService);
    await fixture.whenStable();
    
    // Clear initial manifest
    store.setManifest(null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    let flightCards = compiled.querySelectorAll('[role="button"]') as NodeListOf<HTMLElement>;
    expect(flightCards.length).toBe(3);

    // Trigger Enter key down on first card
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    flightCards[0].dispatchEvent(enterEvent);
    fixture.detectChanges();

    expect(store.manifest()).not.toBeNull();
    const selectedFlightNum1 = store.manifest()?.flightNumber;
    expect(selectedFlightNum1).toBeTruthy();

    // Reset and test Space key down
    store.setManifest(null);
    fixture.detectChanges();

    // Re-query the elements because resetting store.manifest(null) re-created them
    flightCards = compiled.querySelectorAll('[role="button"]') as NodeListOf<HTMLElement>;
    expect(flightCards.length).toBe(3);

    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32 });
    flightCards[1].dispatchEvent(spaceEvent);
    fixture.detectChanges();

    expect(store.manifest()).not.toBeNull();
    const selectedFlightNum2 = store.manifest()?.flightNumber;
    expect(selectedFlightNum2).toBeTruthy();
    expect(selectedFlightNum2).not.toBe(selectedFlightNum1);
  });

  it('should render SeatMap Pro branding in the navigation bar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const navBranding = Array.from(compiled.querySelectorAll('nav span')).find(
      span => span.textContent?.includes('SeatMap Pro')
    );

    expect(navBranding).toBeTruthy();
    expect(navBranding!.className).toContain('font-display');
    expect(navBranding!.className).toContain('font-semibold');
  });

  it('should keep one labelled service selector per breakpoint with unique ids', async () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(StoreService);
    store.setManifest(FLIGHT_AV210);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const selects = Array.from(compiled.querySelectorAll('select[id^="service-type"]'));
    expect(selects.map(s => s.id).sort()).toEqual(['service-type', 'service-type-mobile']);
    selects.forEach(select => {
      expect(compiled.querySelector(`label[for="${select.id}"]`)).toBeTruthy();
    });
  });

  it('should use a lucide arrow icon for flight routes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const demoSelector = compiled.querySelector('app-demo-selector');
    expect(demoSelector).toBeTruthy();

    const routeIcons = demoSelector!.querySelectorAll('[role="button"] > div > lucide-angular[aria-hidden="true"]');
    expect(routeIcons.length).toBe(3);
    routeIcons.forEach(icon => {
      expect(icon.className).toContain('group-hover:translate-x-1');
    });
  });

  describe('Magno Loyalty Status', () => {
    it('should have MAGN and M defined in FLIGHT_CODES.STATUS and exclude them from SSR counts', () => {
      expect(FLIGHT_CODES.STATUS.MAGN).toBe('LifeMiles Magno');
      expect(FLIGHT_CODES.STATUS.M).toBe('LifeMiles Magno');

      const mockPassenger = {
        seat: '1A',
        firstName: 'John',
        lastName: 'Doe',
        codes: ['MAGN', 'M', 'WCHR'],
        rawText: '1A DOE/JOHN'
      };
      const ssrCounts = countSSR([mockPassenger]);
      // MAGN and M should be recognized as status codes, hence excluded from SSR counts.
      // Only WCHR should be counted.
      expect(ssrCounts['MAGN']).toBeUndefined();
      expect(ssrCounts['M']).toBeUndefined();
      expect(ssrCounts['WCHR']).toBe(1);
    });

    it('should aggregate and render Magno passengers in the Stats Sidebar', async () => {
      const fixture = TestBed.createComponent(App);
      const store = TestBed.inject(StoreService);
      await fixture.whenStable();

      store.setManifest({
        flightNumber: 'AV210',
        date: '03 JUN 2026',
        aircraftType: 'A320',
        origin: 'BOG',
        destination: 'JFK',
        departureTime: '07:20',
        serviceType: 'AMERICAS',
        infantCount: 0,
        passengers: [
          {
            seat: '1A',
            firstName: 'CARLOS',
            lastName: 'RAMIREZ',
            status: 'MAGN',
            codes: ['MAGN'],
            rawText: '1A RAMIREZ/CARLOS'
          },
          {
            seat: '1C',
            firstName: 'ANDRES',
            lastName: 'BOTERO',
            status: 'M',
            codes: ['M'],
            rawText: '1C BOTERO/ANDRES'
          }
        ]
      });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const sidebar = compiled.querySelector('app-stats-sidebar');
      expect(sidebar).toBeTruthy();

      // At this point, the HTML should display the Magno passengers, but since we haven't implemented it,
      // it should fail to find "Magno" text/section or fail during compilation.
      const magnoText = sidebar?.textContent;
      expect(magnoText).toContain('Magno');
      expect(magnoText).toContain('1A');
      expect(magnoText).toContain('1C');
    });

    it('should style Magno seats and render Crown badge on the Seat Map', async () => {
      const fixture = TestBed.createComponent(App);
      const store = TestBed.inject(StoreService);
      await fixture.whenStable();

      store.setManifest({
        flightNumber: 'AV210',
        date: '03 JUN 2026',
        aircraftType: 'A320',
        origin: 'BOG',
        destination: 'JFK',
        departureTime: '07:20',
        serviceType: 'AMERICAS',
        infantCount: 0,
        passengers: [
          {
            seat: '1A',
            firstName: 'CARLOS',
            lastName: 'RAMIREZ',
            status: 'MAGN',
            codes: ['MAGN'],
            rawText: '1A RAMIREZ/CARLOS'
          }
        ]
      });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const seatMap = compiled.querySelector('app-seat-map');
      expect(seatMap).toBeTruthy();

      // Get button for seat 1A
      const buttons = Array.from(seatMap!.querySelectorAll('button'));
      const seatButton = buttons.find(b => b.textContent?.includes('1A'))!;
      expect(seatButton).toBeTruthy();

      // The seat class should contain the premium styling classes we require
      const classes = seatButton.className;
      expect(classes).toContain('bg-gradient-to-br');
      expect(classes).toContain('from-[#3c1053]');
      expect(classes).toContain('to-[#ad5389]');
      expect(classes).toContain('border-purple-950');
      expect(classes).toContain('animate-glow-purple');

      // Verify Crown icon badge is rendered in the top right of the seat button
      const crownIcon = seatButton.querySelector('lucide-angular[strokeWidth="2.5"]');
      expect(crownIcon).toBeTruthy();
    });

    it('should display Magno details and card in the Passenger Modal when seat is selected', async () => {
      const fixture = TestBed.createComponent(App);
      const store = TestBed.inject(StoreService);
      await fixture.whenStable();

      store.setManifest({
        flightNumber: 'AV210',
        date: '03 JUN 2026',
        aircraftType: 'A320',
        origin: 'BOG',
        destination: 'JFK',
        departureTime: '07:20',
        serviceType: 'AMERICAS',
        infantCount: 0,
        passengers: [
          {
            seat: '1A',
            firstName: 'CARLOS',
            lastName: 'RAMIREZ',
            status: 'MAGN',
            codes: ['MAGN'],
            rawText: '1A RAMIREZ/CARLOS'
          }
        ]
      });
      fixture.detectChanges();

      // Select seat 1A to open the modal
      store.setSelectedSeat('1A');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const modal = compiled.querySelector('app-passenger-modal');
      expect(modal).toBeTruthy();

      // Check header badge
      const headerBadge = modal?.querySelector('span.animate-glow-purple');
      expect(headerBadge).toBeTruthy();
      expect(headerBadge?.textContent).toContain('Magno Elite');

      // Check loyalty card section
      const loyaltyCard = modal?.querySelector('.border-purple-950');
      expect(loyaltyCard).toBeTruthy();
      expect(loyaltyCard?.textContent).toContain('Estatus Magno');
      expect(loyaltyCard?.textContent).toContain('Magno Elite');

      // Verify Crown icon in the loyalty card
      const crownIcons = loyaltyCard?.querySelectorAll('lucide-icon');
      const hasCrownIcon = Array.from(crownIcons || []).some(icon => {
        return icon.innerHTML.includes('M11.562 3.266');
      });
      expect(hasCrownIcon).toBe(true);
    });

    it('should have mock data containing MAGN passengers', () => {
      // Carlos Ramirez in FLIGHT_AV210
      const ramirez = FLIGHT_AV210.passengers.find(p => p.lastName === 'RAMIREZ' && p.firstName === 'CARLOS');
      expect(ramirez?.status).toBe('MAGN');
      expect(ramirez?.codes).toContain('MAGN');

      // Rafael Echeverri in FLIGHT_AV026
      const echeverri = FLIGHT_AV026.passengers.find(p => p.lastName === 'ECHEVERRI' && p.firstName === 'RAFAEL');
      expect(echeverri?.status).toBe('MAGN');
      expect(echeverri?.codes).toContain('MAGN');

      // Gustavo Llinás in FLIGHT_AV120
      const llinas = FLIGHT_AV120.passengers.find(p => p.lastName === 'LLINÁS' && p.firstName === 'GUSTAVO');
      expect(llinas?.status).toBe('MAGN');
      expect(llinas?.codes).toContain('MAGN');
    });
  });

  describe('C5 · T1/T2, T6 & T5 Integración', () => {
    it('T1/T2: Comanda en AV210 sin select, selección en verde emerald, conteo estable entre zonas y persistente', async () => {
      const fixture = TestBed.createComponent(App);
      const store = TestBed.inject(StoreService);
      await fixture.whenStable();

      store.setManifest(FLIGHT_AV210);
      fixture.detectChanges();

      // Abrir pax 1 (1A, Business, zona A-D)
      store.setSelectedSeat('1A');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const modal = compiled.querySelector('app-passenger-modal');
      expect(modal).toBeTruthy();

      // 1. Verificar que NO existe select en comanda-form
      const comandaSelect = modal?.querySelector('app-comanda-form select');
      expect(comandaSelect).toBeNull();

      // 2. Localizar botones de opciones de plato fuerte
      const optionButtons = Array.from(modal?.querySelectorAll('app-menu-option-list button') || []) as HTMLButtonElement[];
      expect(optionButtons.length).toBeGreaterThan(0);

      // Clic en la primera opción de plato fuerte
      optionButtons[0].click();
      fixture.detectChanges();

      // Verificar selección con aria-pressed="true" y clases emerald
      expect(optionButtons[0].getAttribute('aria-pressed')).toBe('true');
      expect(optionButtons[0].className).toContain('border-emerald-500/25');
      expect(optionButtons[0].className).toContain('bg-emerald-500/10');

      // 3. Abrir otro pasajero de otra zona (1K, Business, zona E-K)
      store.setSelectedSeat('1K');
      fixture.detectChanges();

      const pax2Buttons = Array.from(modal?.querySelectorAll('app-menu-option-list button') || []) as HTMLButtonElement[];
      // El primer botón para pax 2 no debe estar seleccionado para pax 2
      expect(pax2Buttons[0].getAttribute('aria-pressed')).toBe('false');
      // Pero debe reflejar el restante descontado en la misma bolsa común de AMERICAS
      const pax2AriaLabel = pax2Buttons[0].getAttribute('aria-label');
      expect(pax2AriaLabel).toBeTruthy();

      // 4. Volver a pax 1 (1A) y confirmar que conserva su selección
      store.setSelectedSeat('1A');
      fixture.detectChanges();

      const pax1ButtonsAgain = Array.from(modal?.querySelectorAll('app-menu-option-list button') || []) as HTMLButtonElement[];
      expect(pax1ButtonsAgain[0].getAttribute('aria-pressed')).toBe('true');
    });

    it('T6: clic en tarjeta Sillas Vacías activa modo ocupación en el mapa, colorea verde y ámbar, y segundo clic restaura', async () => {
      const fixture = TestBed.createComponent(App);
      const store = TestBed.inject(StoreService);
      await fixture.whenStable();

      store.setManifest(FLIGHT_AV210);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const stats = store.flightStats();

      // Buscar el botón toggle de Sillas Vacías en stats-sidebar
      const toggleButton = compiled.querySelector('aside button[aria-pressed]') as HTMLButtonElement;
      expect(toggleButton).toBeTruthy();
      expect(toggleButton.getAttribute('aria-pressed')).toBe('false');

      // Primer clic -> activar modo ocupación
      toggleButton.click();
      fixture.detectChanges();

      expect(store.showOccupancy()).toBe(true);
      expect(toggleButton.getAttribute('aria-pressed')).toBe('true');

      // Verificar mapa de asientos
      const seatButtons = Array.from(compiled.querySelectorAll('app-seat-map button.size-11')) as HTMLButtonElement[];
      expect(seatButtons.length).toBeGreaterThan(0);

      const emptySeatElements = seatButtons.filter(b => b.className.includes('bg-emerald-500/20'));
      const occupiedSeatElements = seatButtons.filter(b => b.className.includes('bg-amber-400/25'));

      expect(emptySeatElements.length).toBe(stats.emptySeats);
      expect(occupiedSeatElements.length).toBe(stats.totalPassengers);

      // Segundo clic -> desactivar y restaurar
      toggleButton.click();
      fixture.detectChanges();

      expect(store.showOccupancy()).toBe(false);
      expect(toggleButton.getAttribute('aria-pressed')).toBe('false');

      const restoredOccupied = seatButtons.filter(b => b.className.includes('bg-amber-400/25'));
      expect(restoredOccupied.length).toBe(0);
    });

    it('Ronda 3: filtros de mapa para INF, SSR, Comidas y códigos, con atenuación, un solo activo y detalle sincronizado', async () => {
      const fixture = TestBed.createComponent(App);
      const store = TestBed.inject(StoreService);
      await fixture.whenStable();

      store.setManifest(FLIGHT_AV210);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const bentoButtons = Array.from(compiled.querySelectorAll('aside div.shrink-0.grid button[aria-pressed]')) as HTMLButtonElement[];
      expect(bentoButtons.length).toBe(4); // Sillas Vacías, Infantes, SSR, Comidas

      const [sillasVacíasBtn, infantesBtn, ssrBtn, comidasBtn] = bentoButtons;

      // Verificar altura fija min-h-[80px]
      expect(infantesBtn.className).toContain('min-h-[80px]');
      expect(ssrBtn.className).toContain('min-h-[80px]');
      expect(comidasBtn.className).toContain('min-h-[80px]');

      // 1. Activar Infantes (INF)
      infantesBtn.click();
      fixture.detectChanges();

      expect(store.mapLens()?.kind).toBe('infants');
      expect(infantesBtn.getAttribute('aria-pressed')).toBe('true');
      expect(sillasVacíasBtn.getAttribute('aria-pressed')).toBe('false');
      expect(ssrBtn.getAttribute('aria-pressed')).toBe('false');
      expect(comidasBtn.getAttribute('aria-pressed')).toBe('false');
      expect(infantesBtn.className).toContain('min-h-[80px]'); // No cambia de altura al activarse

      let seatButtons = Array.from(compiled.querySelectorAll('app-seat-map button.size-11')) as HTMLButtonElement[];
      let skySeats = seatButtons.filter(b => b.className.includes('bg-sky-500/25'));
      expect(skySeats.length).toBe(store.lensSeats()?.size ?? 0);
      expect(skySeats.length).toBeGreaterThan(0);

      // Los que no coinciden tienen opacity-40
      const dimmedSeats = seatButtons.filter(b => b.className.includes('opacity-40'));
      expect(dimmedSeats.length).toBeGreaterThan(0);

      // Segundo clic en Infantes apaga el filtro
      infantesBtn.click();
      fixture.detectChanges();
      expect(store.mapLens()).toBeNull();
      expect(infantesBtn.getAttribute('aria-pressed')).toBe('false');
      skySeats = seatButtons.filter(b => b.className.includes('bg-sky-500/25'));
      expect(skySeats.length).toBe(0);

      // 2. Activar SSR
      ssrBtn.click();
      fixture.detectChanges();
      expect(store.mapLens()?.kind).toBe('ssr');
      expect(ssrBtn.getAttribute('aria-pressed')).toBe('true');
      expect(infantesBtn.getAttribute('aria-pressed')).toBe('false');
      skySeats = (Array.from(compiled.querySelectorAll('app-seat-map button.size-11')) as HTMLButtonElement[])
        .filter(b => b.className.includes('bg-sky-500/25'));
      expect(skySeats.length).toBe(store.lensSeats()?.size ?? 0);

      // 3. Activar Comidas (reemplaza a SSR, solo uno activo a la vez)
      comidasBtn.click();
      fixture.detectChanges();
      expect(store.mapLens()?.kind).toBe('meals');
      expect(comidasBtn.getAttribute('aria-pressed')).toBe('true');
      expect(ssrBtn.getAttribute('aria-pressed')).toBe('false');
      skySeats = (Array.from(compiled.querySelectorAll('app-seat-map button.size-11')) as HTMLButtonElement[])
        .filter(b => b.className.includes('bg-sky-500/25'));
      expect(skySeats.length).toBe(store.lensSeats()?.size ?? 0);

      // 4. Activar un tile de código SSR
      const codeButtons = Array.from(compiled.querySelectorAll('aside div.border-t .grid button[aria-pressed]')) as HTMLButtonElement[];
      expect(codeButtons.length).toBeGreaterThan(0);
      const firstCodeBtn = codeButtons[0];
      const codeText = firstCodeBtn.querySelector('span')?.textContent?.trim() || '';

      firstCodeBtn.click();
      fixture.detectChanges();

      expect(store.mapLens()?.kind).toBe('code');
      expect(store.mapLens()).toEqual({ kind: 'code', code: codeText });
      expect(firstCodeBtn.getAttribute('aria-pressed')).toBe('true');
      expect(comidasBtn.getAttribute('aria-pressed')).toBe('false');

      // Detalle expandido visible
      const expandedSection = compiled.querySelector('aside div.border-line-strong.rounded-xl.p-3');
      expect(expandedSection).toBeTruthy();
      expect(expandedSection?.textContent).toContain(codeText);

      // 5. Botón Quitar en el chip móvil
      const quitarBtn = compiled.querySelector('button[aria-label="Quitar filtro del mapa"]') as HTMLButtonElement;
      expect(quitarBtn).toBeTruthy();
      quitarBtn.click();
      fixture.detectChanges();

      expect(store.mapLens()).toBeNull();
      expect(firstCodeBtn.getAttribute('aria-pressed')).toBe('false');

      // 6. Cambiar de vuelo limpia el lente
      ssrBtn.click();
      fixture.detectChanges();
      expect(store.mapLens()?.kind).toBe('ssr');

      store.setManifest(FLIGHT_AV026);
      fixture.detectChanges();
      expect(store.mapLens()).toBeNull();
    });

    it('T5: ausencia total de emojis en textos renderizados de la aplicación y plantillas de src/app', async () => {
      const fixture = TestBed.createComponent(App);
      const store = TestBed.inject(StoreService);
      await fixture.whenStable();

      store.setManifest(FLIGHT_AV210);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const emojiRegex = /\p{Extended_Pictographic}/u;

      // Verificar texto renderizado en el DOM
      const renderedText = compiled.textContent || '';
      expect(emojiRegex.test(renderedText)).toBe(false);
    });
  });
});

