import { enableProdMode, ErrorHandler } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { HotelConfigService } from './app/_service/hotel-config.service';

// Catch ANY unhandled error before Angular gets it
window.addEventListener('error', (e) => {
  console.error('🪲 window error event:', e.error?.stack || e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('🪲 unhandled promise rejection:', e.reason?.stack || e.reason);
});

if (environment.production) {
  enableProdMode();
}

// Load hotel config BEFORE bootstrapping so every service has it ready
const hotelConfigService = new HotelConfigService();

hotelConfigService.load()
  .then(() => {
    platformBrowserDynamic([
      { provide: HotelConfigService, useValue: hotelConfigService }
    ])
    .bootstrapModule(AppModule)
    .then(() => console.log('✅ Bootstrap complete'))
    .catch(err => {
      console.error('💥 Bootstrap failed:', err);
      console.error('💥 message:', err.message);
      let cause = err;
      let depth = 0;
      while (cause && depth < 5) {
        console.error(`💥 cause[${depth}]:`, cause.message, cause.stack);
        cause = cause.cause || cause.originalError || cause.rejection || null;
        depth++;
      }
    });
  })
  .catch(err => {
    console.error('💥 Hotel config failed to load:', err);
    document.body.innerHTML = `
      <div style="font-family:sans-serif;padding:2rem;color:#c00">
        <h2>Error al cargar configuración del hotel</h2>
        <pre>${err}</pre>
      </div>`;
  });