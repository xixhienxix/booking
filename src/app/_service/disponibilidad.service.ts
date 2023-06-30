import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IDisponibilidad } from '../_models/disponibilidad.model'
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';
import { IHabitaciones } from '../_models/habitaciones.model';
import { DateTime } from 'luxon'
@Injectable({
  providedIn: 'root'
})
export class DisponibilidadService {

  private disponibilidad$: BehaviorSubject<IHabitaciones[]> = new BehaviorSubject<IHabitaciones[]>([]);
  currentData = this.disponibilidad$.asObservable();

  private fechaInicial$: BehaviorSubject<DateTime> = new BehaviorSubject<DateTime>(DateTime.now())
  currentFechaIni = this.fechaInicial$.asObservable();

  private fechaFinal$: BehaviorSubject<DateTime> = new BehaviorSubject<DateTime>(DateTime.now())
  currentFechaFin = this.fechaFinal$.asObservable();


  constructor(
    private http:HttpClient
  ) { }

  changeFechaIni(data:DateTime){
    this.fechaInicial$.next(data);
  }

  changeFechaFinal(data:DateTime){
    this.fechaFinal$.next(data)
  }

  changeData(data:any){
    this.disponibilidad$.next(data);
  }

  getDisponibilidadBooking(fechaInicial:string, fechaFinal:string, dias:number){
    var inputFormat = "dd-MM-yyyy";

    const params = new HttpParams()
    .set('fechaInicial', fechaInicial)
    .set('fechaFinal', fechaFinal)
    .set('dias',dias)

    return this.http.get<IDisponibilidad[]>(environment.apiUrl+"/booking/disponibilidad",{params:params})
   }
}
