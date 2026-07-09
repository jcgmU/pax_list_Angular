import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { StoreService } from './store.service';

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
});
