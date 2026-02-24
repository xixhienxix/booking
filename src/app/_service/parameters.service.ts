import { Injectable } from "@angular/core";
import { DEFAULT_PARAMETERS, PARAMETERS } from "../_models/parameters.model";
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { BehaviorSubject, Observable, tap } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class ParametersService {
    private _parameters$ = new BehaviorSubject<PARAMETERS>(DEFAULT_PARAMETERS);
    readonly parameters$ = this._parameters$.asObservable();

    constructor(private http: HttpClient) {
    }

    get currentParameters(){
        return this._parameters$.value
    }

    getAll(): Observable<PARAMETERS> {
        return this.http.get<PARAMETERS>(`${environment.apiUrl}/booking/parameters`).pipe(
            tap((parameters: PARAMETERS) => this._parameters$.next(parameters)
        ));
    }
}