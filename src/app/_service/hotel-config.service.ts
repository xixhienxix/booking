import { Injectable } from "@angular/core";

export interface HotelConfig {
  hotelID:        string;
  hotelNombre:    string;
  hotelLogo:      string;
  hotelColor:     string;
  apiUrl:         string;
  internalSecret: string;
}

@Injectable()
export class HotelConfigService {
  private config: HotelConfig | null = null;

  async load(): Promise<void> {
    console.log('🔄 [HotelConfig] load() started');
    try {
      const response = await fetch('assets/hotel-config.json');
      console.log('🌐 [HotelConfig] fetch response status:', response.status, response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      this.config = await response.json();
      console.log('✅ [HotelConfig] config set:', this.config);
      console.log('✅ [HotelConfig] isLoaded:', this.isLoaded);

    } catch (err) {
      console.error('❌ [HotelConfig] load() threw — this causes NG0403:', err);
      // swallow the error so APP_INITIALIZER resolves
    }

    console.log('🏁 [HotelConfig] load() finished, config is:', this.config);
  }

  get current(): HotelConfig | null { return this.config; }

  get currentOrThrow(): HotelConfig {
    console.log('⚠️ [HotelConfig] currentOrThrow called, isLoaded:', this.isLoaded);
    if (!this.config) throw new Error('HotelConfig not loaded yet');
    return this.config;
  }

  get isLoaded(): boolean { return this.config !== null; }

}