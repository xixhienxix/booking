import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable, Injector } from "@angular/core"; // 1. Added Injector
import { Observable } from "rxjs";
import { HotelConfigService } from "../_service/hotel-config.service";

@Injectable()
export class HotelInterceptor implements HttpInterceptor {
  
  // 2. Inject the Injector instead of the service directly
  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // 3. Manually get the service instance here
    const _hotelConfig = this.injector.get(HotelConfigService);
    console.log('🔁 [Interceptor] fired for:', req.url);
    console.log('🔁 [Interceptor] isLoaded:', _hotelConfig.isLoaded);
    console.log('🔁 [Interceptor] current:', _hotelConfig.current);

    // 4. Update references from this._hotelConfig to _hotelConfig
    if (!_hotelConfig.isLoaded || !_hotelConfig.current) {
      return next.handle(req);
    }

    const { hotelID, internalSecret, apiUrl } = _hotelConfig.current;

    let url = req.url;
    if (!url.startsWith('http')) {
      url = `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    const headers: Record<string, string> = {
      'Accept':            'application/json',
      'hotel':             hotelID,
      'x-hotel-id':        hotelID,
    };

    if (internalSecret) {
      headers['x-internal-access'] = internalSecret;
    }

    if (!(req.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }

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