import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient,HttpParams } from "@angular/common/http";
import { catchError, map, tap } from 'rxjs/operators';
import { IHabitaciones } from '../_models/habitaciones.model'
import { environment } from 'src/environments/environment';
import { Ihoteles } from '../_models/hoteles.model';
import { HotelConfigService } from './hotel-config.service';

@Injectable({
  providedIn: 'root'
})
export class HabitacionesService {
  
  private listaFolios: IHabitaciones[] = [];

  private _habitaciones$ = new BehaviorSubject<IHabitaciones[]>([]);
  readonly habitaciones$ = this._habitaciones$.asObservable();

  get currentHabitaciones(){
    return this._habitaciones$.value
  }

  getHoteles() : Observable<string[]>{
    return  (this.http.get<string[]>(this._hotelConfig.current?.apiUrl+"/listahoteles")
    .pipe(
      map(responseData=>{
        return responseData
      })
    ))
  }

  getHabitacionesbyTipo(id:string) : Observable<IHabitaciones[]> {

    return  (this.http.get<IHabitaciones[]>(this._hotelConfig.current?.apiUrl+"/reportes/habitaciones/"+id)
      .pipe(
        map(responseData=>{
          return responseData
        })
      ))
  }

  getHabitacionbyNumero(numero:string) : Observable<IHabitaciones[]> {
    return  (this.http.get<IHabitaciones[]>(this._hotelConfig.current?.apiUrl+"/reportes/habitacion/"+numero)
        .pipe(
          map(responseData=>{
            return responseData
          })
        ))
    }

  getHabitaciones() :Observable<IHabitaciones[]> {
    return this.http.get<IHabitaciones[]>(this._hotelConfig.current?.apiUrl + '/habitaciones')
          .pipe(tap(habs => this._habitaciones$.next(habs)));
  }

  getInfoHabitaciones(numero:string,tipo:string) :Observable<IHabitaciones[]> {
    const params = new HttpParams()
    .set('numero', numero.toString())
    .set('tipo', tipo)

    return this.http
     .get<IHabitaciones[]>(this._hotelConfig.current?.apiUrl + '/info/habitaciones', {params:params})
     .pipe(
       map(responseData=>{
       return responseData
     })
     )

   }

   getCodigohabitaciones() :Observable<IHabitaciones[]> {

    return this.http
     .get<IHabitaciones[]>(this._hotelConfig.current?.apiUrl + '/reportes/tipo')
     .pipe(
       map(responseData=>{
       return responseData
     })
     )

   }

  constructor(private http: HttpClient, private _hotelConfig: HotelConfigService) { }
}
