import { enableProdMode, ErrorHandler } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

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

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then(() => console.log('✅ Bootstrap complete'))
  .catch(err => {
    console.error('💥 Bootstrap failed:', err);
    console.error('💥 message:', err.message);
    // Dig into nested errors
    let cause = err;
    let depth = 0;
    while (cause && depth < 5) {
      console.error(`💥 cause[${depth}]:`, cause.message, cause.stack);
      cause = cause.cause || cause.originalError || cause.rejection || null;
      depth++;
    }
  });