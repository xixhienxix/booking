import { HttpEvent, HttpHandler,HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable()
export class HotelInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        const hotel = localStorage.getItem("HOTEL") || '';
        const accesSecret = environment.BOOKING_APP_SECRET;

            const cloned = req.clone({
                    setHeaders: {
                      'Content-Type' : 'application/json; charset=utf-8',
                      'Accept'       : 'application/json',
                      'Hotel': hotel,
                      'x-internal-access': accesSecret
                    },
            })
            return next.handle(cloned)

    }
}