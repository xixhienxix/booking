import { HttpEvent, HttpHandler,HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";
import { HotelConfigService } from "../_service/hotel-config.service";

@Injectable()
export class HotelInterceptor implements HttpInterceptor {
    constructor(private _hotelConfig: HotelConfigService){}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (!this._hotelConfig.isLoaded) {
        return next.handle(req);
        }

        const hotelID = this._hotelConfig.current!.hotelID;
        const accesSecret = environment.BOOKING_APP_SECRET;

            const cloned = req.clone({
                    setHeaders: {
                      'Content-Type' : 'application/json; charset=utf-8',
                      'Accept'       : 'application/json',
                      'Hotel': hotelID,
                      'x-internal-access': accesSecret
                    },
            })
            return next.handle(cloned)

    }
}