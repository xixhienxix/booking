import { Injectable } from '@angular/core';

export interface HotelConfig {
  hotelID:     string;
  hotelNombre: string;
  hotelLogo:   string;
  hotelColor:  string;
  apiUrl:      string;
}

// Maps ?hotel= query param → JSON filename in /hotel-configs/
const HOTEL_MAP: Record<string, string> = {
  'movnext':               'movnext',
  'hotel-palomas':         'hotel-palomas',
  'hotel-palomas-express': 'hotel-palomas-express',
  'hotel-palomas-nayarit': 'hotel-palomas-nayarit',
};

@Injectable({ providedIn: 'root' })
export class HotelConfigService {
  private _config: HotelConfig | null = null;

  get isLoaded(): boolean {
    return this._config !== null;
  }

  get current(): HotelConfig {
    if (!this._config) throw new Error('[HotelConfig] Service accessed before load() completed.');
    return this._config;
  }

  async load(): Promise<void> {
    const params     = new URLSearchParams(window.location.search);
    const hotelParam = params.get('hotel')?.toLowerCase() ?? null;
    const hotelFile  = hotelParam ? (HOTEL_MAP[hotelParam] ?? null) : null;

    // No param → fallback to root hotel-config.json (local dev default)
    const url = hotelFile
      ? `/hotel-configs/${hotelFile}.json`
      : '/hotel-config.json';

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load config from ${url} — ${res.status}`);
      this._config = await res.json();
      console.log(`[HotelConfig] Loaded "${this._config?.hotelID}" from ${url}`);
    } catch (err) {
      console.error('[HotelConfig] Could not load hotel config:', err);
      throw err;
    }
  }
}