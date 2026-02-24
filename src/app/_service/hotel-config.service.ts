import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";

export interface HotelConfig {
  hotelID: string;
  hotelNombre: string;
  hotelLogo: string;
  hotelColor: string;
  apiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class HotelConfigService {
  private config: HotelConfig | null = null;

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    this.config = await firstValueFrom(
      this.http.get<HotelConfig>('/assets/hotel-config.json')
    );
    console.log('✅ HotelConfig loaded:', this.config.hotelID);
  }

  // ── Safe getter — returns null if not loaded yet ─────────
  get current(): HotelConfig | null {
    return this.config;
  }

  // ── Use this when you NEED the value and expect it loaded ─
  get currentOrThrow(): HotelConfig {
    if (!this.config) throw new Error('HotelConfig not loaded yet');
    return this.config;
  }

  get isLoaded(): boolean {
    return this.config !== null;
  }
}
