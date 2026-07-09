import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { StoreService } from './store.service';
import { FLIGHT_CODES } from '../domain/flightCodes';
import { countSSR } from '../domain/flightStats';

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

    // Verify flight cards have role="button", tabindex="0", and focus classes
    const flightCards = compiled.querySelectorAll('[role="button"]');
    expect(flightCards.length).toBe(3); // Should have 3 demo flights
    flightCards.forEach(card => {
      expect(card.getAttribute('tabindex')).toBe('0');
      expect(card.className).toContain('focus-visible:ring-2');
      expect(card.className).toContain('focus-visible:ring-red-500/50');
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

  it('should use uppercase title branding with specific classes in navigation and selector', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const brandingSpans = compiled.querySelectorAll('span');
    let foundNavbarBranding = false;
    let foundSelectorBranding = false;

    brandingSpans.forEach(span => {
      if (span.textContent?.includes('SeatMap Pro')) {
        const classes = span.className;
        if (classes.includes('uppercase') && classes.includes('font-bold') && classes.includes('tracking-wider')) {
          if (span.closest('nav')) {
            foundNavbarBranding = true;
          } else {
            foundSelectorBranding = true;
          }
        }
      }
    });

    expect(foundNavbarBranding).toBe(true);
    expect(foundSelectorBranding).toBe(true);
  });

  it('should use lucide plane icon for flight routes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const demoSelector = compiled.querySelector('app-demo-selector');
    expect(demoSelector).toBeTruthy();

    // Verify that the manual <svg> is gone from the flight route container
    const manualSvgs = demoSelector?.querySelectorAll('div.absolute.bg-white.px-2 > svg');
    expect(manualSvgs?.length).toBe(0);

    // Verify that it is replaced by lucide-angular with appropriate classes
    const lucideRouteIcons = demoSelector?.querySelectorAll('div.absolute.bg-white.px-2 > lucide-angular');
    expect(lucideRouteIcons?.length).toBeGreaterThan(0);
    
    let hasPlaneIcon = false;
    lucideRouteIcons?.forEach(icon => {
      const classes = icon.className;
      if (classes.includes('rotate-90') && classes.includes('text-[#E20613]') && classes.includes('group-hover:translate-x-3')) {
        hasPlaneIcon = true;
      }
    });
    expect(hasPlaneIcon).toBe(true);
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
  });
});

