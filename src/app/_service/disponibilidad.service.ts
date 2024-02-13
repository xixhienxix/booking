import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IDisponibilidad } from '../_models/disponibilidad.model'
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';
import { IHabitaciones } from '../_models/habitaciones.model';
import { DateTime } from 'luxon'
import { miReserva } from '../_models/mireserva.model';
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

  private miReserva$: BehaviorSubject<miReserva[]> = new BehaviorSubject<miReserva[]>([])
  currentReserva = this.miReserva$.asObservable();

  constructor(
    private http:HttpClient
  ) { }

  addMiReserva(data:miReserva[]){
    this.miReserva$.next(this.miReserva$.getValue().concat(data))
  }

  changeMiReserva(data:miReserva[]){
    this.miReserva$.next(data)
  }

  changeFechaIni(data:DateTime){
    this.fechaInicial$.next(data);
  }

  changeFechaFinal(data:DateTime){
    this.fechaFinal$.next(data)
  }

  changeData(data:any){
    this.disponibilidad$.next(data);
  }

  getDisponibilidadBooking(fechaInicial:string, fechaFinal:string, dias:number, hotel:string){
    var inputFormat = "dd-MM-yyyy";

    const params = new HttpParams()
    .set('fechaInicial', fechaInicial)
    .set('fechaFinal', fechaFinal)
    .set('dias',dias)
    .set('hotel',hotel)

    return this.http.get<IDisponibilidad[]>(environment.apiUrl+"/booking/disponibilidad",{params:params})
   }
}
