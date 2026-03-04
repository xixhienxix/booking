import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";

export interface HotelConfig {
  hotelID:        string;
  hotelNombre:    string;
  hotelLogo:      string;
  hotelColor:     string;
  apiUrl:         string;
  internalSecret: string;   
}

@Injectable({ providedIn: 'root' })
export class HotelConfigService {
  private config: HotelConfig | null = null;

  constructor() {}

    async load(): Promise<void> {
    const response = await fetch('/assets/hotel-config.json');
    this.config = await response.json();
    console.log('✅ Full config:', this.config); // ← check exact keys
    }

  // ── Safe getter — returns null if not loaded yet ─────────
  get current(): HotelConfig | null { return this.config; }


  // ── Use this when you NEED the value and expect it loaded ─
  get currentOrThrow(): HotelConfig {
    if (!this.config) throw new Error('HotelConfig not loaded yet');
    return this.config;
  }

  get isLoaded(): boolean { return this.config !== null; }

}
