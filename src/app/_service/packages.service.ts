import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Packages } from "../_models/packages.model";
import { environment } from "src/environments/environment";
import { catchError, map, Observable, throwError } from "rxjs";

@Injectable({
    providedIn:'root'
})
export class PackagesService {
    constructor(private http: HttpClient){}

    getAllPackages(): Observable<Packages[]> {
    return this.http.get<Packages[]>(`${environment.apiUrl}/catalogos/paquetes`).pipe(
        catchError(error => {
        console.error('Error fetching packages:', error);
        return throwError(() => error); // or return of(defaultValue) to recover
        })
    );
    }
}