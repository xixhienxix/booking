import { HttpEvent, HttpHandler,HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable()
export class HotelInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        const hotel = localStorage.getItem("HOTEL") || '';

            const cloned = req.clone({
                    setHeaders: {
                      'Content-Type' : 'application/json; charset=utf-8',
                      'Accept'       : 'application/json',
                      'Hotel': hotel,
                    },
            })
            return next.handle(cloned)

    }
}