import { Injectable } from "@angular/core";
import { DEFAULT_PARAMETERS, PARAMETERS, Parametros_Front, PARAMETROS_FRONT_DEFAULT_VALUES } from "../_models/parameters.model";
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { HotelConfigService } from "./hotel-config.service";

@Injectable({
    providedIn: 'root'
})
export class ParametersService {
    private _parameters$ = new BehaviorSubject<PARAMETERS>(DEFAULT_PARAMETERS);
    readonly parameters$ = this._parameters$.asObservable();

    private _parametersFront$ = new BehaviorSubject<Parametros_Front>(PARAMETROS_FRONT_DEFAULT_VALUES);
    readonly parametersFront$ = this._parameters$.asObservable();

    constructor(private http: HttpClient, private _hotelConfig: HotelConfigService) {
    }

    get currentParameters(){
        return this._parameters$.value
    }

    get currentFrontParameters(){
        return this._parametersFront$.value
    }

    getAll(): Observable<PARAMETERS> {
        return this.http.get<PARAMETERS>(`${this._hotelConfig.current?.apiUrl}/booking/parameters`).pipe(
            tap((parameters: PARAMETERS) => this._parameters$.next(parameters)
        ));
    }

    getFrontParameters(): Observable<Parametros_Front> {
        return this.http.get<Parametros_Front>(`${this._hotelConfig.current?.apiUrl}/parametros/public`).pipe(
            tap((parameters: Parametros_Front) => this._parametersFront$.next(parameters)
        ));
    }
}