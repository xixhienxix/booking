import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, map } from "rxjs";
import { ITarifas } from "../_models/tarifas.model";
import { environment } from "src/environments/environment";
import { tarifarioTabla } from "../_models/tarifario.model";

@Injectable({
    providedIn: 'root'
  })

  export class SpinnerService {

    constructor(){
    }

    isLoading$ = new BehaviorSubject<boolean>(false)

    set loadingState(loading:boolean) {
        this.isLoading$.next(loading)
    } 
    getloadingState() {
        return this.isLoading$.asObservable();
    }
  }