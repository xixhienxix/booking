import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HotelConfigService } from "../_service/hotel-config.service";

@Injectable()
export class HotelInterceptor implements HttpInterceptor {
  constructor(private _hotelConfig: HotelConfigService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // ── Skip if config not loaded yet (e.g. the hotel-config.json fetch itself)
    if (!this._hotelConfig.isLoaded || !this._hotelConfig.current) {
      return next.handle(req);
    }

    const { hotelID, internalSecret, apiUrl } = this._hotelConfig.current;

    // ── Rewrite relative URLs to use apiUrl from hotel-config.json ──
    let url = req.url;
    if (!url.startsWith('http')) {
      url = `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    // ── Build headers ────────────────────────────────────────────────
    const headers: Record<string, string> = {
      'Accept':            'application/json',
      'hotel':             hotelID,   // ← what backend reads from headers
      'x-hotel-id':        hotelID,   // ← keep for guards
    };

    if (internalSecret) {
      headers['x-internal-access'] = internalSecret;
    }

    // ── Don't force Content-Type on FormData requests ────────────────
    if (!(req.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }

    // ── Inject hotel into body for POST/PUT/PATCH ────────────────────
    // Skip if body uses nested { params: {} } shape (e.g. disponibilidad calls)
    let body = req.body;
    if (
      body &&
      ['POST', 'PUT', 'PATCH'].includes(req.method) &&
      !(body instanceof FormData) &&
      !body.params
    ) {
      body = { ...body, hotel: hotelID };
    }

    const cloned = req.clone({ url, setHeaders: headers, body });
    return next.handle(cloned);
  }
}