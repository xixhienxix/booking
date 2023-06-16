import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IDisponibilidad } from '../_models/disponibilidad.model'
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';
import { IHabitaciones } from '../_models/habitaciones.model';

@Injectable({
  providedIn: 'root'
})
export class DisponibilidadService {

  private disponibilidad$: BehaviorSubject<IHabitaciones[]> = new BehaviorSubject<IHabitaciones[]>([]);
  currentData = this.disponibilidad$.asObservable();

  constructor(
    private http:HttpClient
  ) { }

  changeData(data:any){
    this.disponibilidad$.next(data);
  }

  getDisponibilidadBooking(fechaInicial:string, fechaFinal:string, dias:number){
    //Format List: https://moment.github.io/luxon/docs/manual/parsing.html#fromformat
    var inputFormat = "dd-MM-yyyy";

    const params = new HttpParams()
    .set('fechaInicial', fechaInicial)
    .set('fechaFinal', fechaFinal)
    .set('dias',dias)

    return this.http.get<IDisponibilidad[]>(environment.apiUrl+"/booking/disponibilidad",{params:params})
   }
}
