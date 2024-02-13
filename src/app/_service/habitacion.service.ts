import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient,HttpParams } from "@angular/common/http";
import { catchError, map, tap } from 'rxjs/operators';
import { IHabitaciones } from '../_models/habitaciones.model'
import { environment } from 'src/environments/environment';
import { Ihoteles } from '../_models/hoteles.model';

@Injectable({
  providedIn: 'root'
})
export class HabitacionesService {
  private listaFolios: IHabitaciones[] = [];


  getHoteles() : Observable<string[]>{

    return  (this.http.get<string[]>(environment.apiUrl+"/listahoteles")
    .pipe(
      map(responseData=>{
        return responseData
      })
    ))
  }

  getHabitacionesbyTipo(id:string) : Observable<IHabitaciones[]> {

    return  (this.http.get<IHabitaciones[]>(environment.apiUrl+"/reportes/habitaciones/"+id)
      .pipe(
        map(responseData=>{
          return responseData
        })
      ))
  }

  getHabitacionbyNumero(numero:string) : Observable<IHabitaciones[]> {

    return  (this.http.get<IHabitaciones[]>(environment.apiUrl+"/reportes/habitacion/"+numero)
        .pipe(
          map(responseData=>{
            return responseData
          })
        ))
    }

  getHabitaciones() :Observable<IHabitaciones[]> {
   return this.http
    .get<IHabitaciones[]>(environment.apiUrl + '/reportes/habitaciones')
  }

  getInfoHabitaciones(numero:string,tipo:string) :Observable<IHabitaciones[]> {
    const params = new HttpParams()
    .set('numero', numero.toString())
    .set('tipo', tipo)

    return this.http
     .get<IHabitaciones[]>(environment.apiUrl + '/info/habitaciones', {params:params})
     .pipe(
       map(responseData=>{
       return responseData
     })
     )

   }

   getCodigohabitaciones() :Observable<IHabitaciones[]> {

    return this.http
     .get<IHabitaciones[]>(environment.apiUrl + '/reportes/tipo')
     .pipe(
       map(responseData=>{
       return responseData
     })
     )

   }

  constructor(private http: HttpClient) { }
}
