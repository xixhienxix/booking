import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, map } from "rxjs";
import { ITarifas } from "../_models/tarifas.model";
import { environment } from "src/environments/environment";
import { tarifarioTabla } from "../_models/tarifario.model";

@Injectable({
    providedIn: 'root'
  })

  export class TarifasService {

    constructor(private http : HttpClient){
    }

    private tarifas$ :BehaviorSubject<tarifarioTabla[]> = new BehaviorSubject<tarifarioTabla[]>([])
    currentData = this.tarifas$.asObservable();


    updateTarifario(data:any){
        this.tarifas$.next(data)
    }

    getTarifas() :Observable<ITarifas[]> {
        return this.http
         .get<ITarifas[]>(environment.apiUrl + '/tarifario/tarifas')
         .pipe(
           map(responseData=>{
           return responseData
         })
         )
     
       }

  }