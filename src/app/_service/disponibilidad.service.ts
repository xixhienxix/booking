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

  private cuartosNoDisponibles$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  currentCuartosNoDisponibles = this.cuartosNoDisponibles$.asObservable();

  private disponibilidad$: BehaviorSubject<IHabitaciones[]> = new BehaviorSubject<IHabitaciones[]>([]);
  currentData = this.disponibilidad$.asObservable();

  private fechaInicial$: BehaviorSubject<Date> = new BehaviorSubject<Date>(new Date())
  currentFechaIni = this.fechaInicial$.asObservable();

  private fechaFinal$: BehaviorSubject<Date> = new BehaviorSubject<Date>(new Date(Date.now() + ( 3600 * 1000 * 24)))
  currentFechaFin = this.fechaFinal$.asObservable();

  private miReserva$: BehaviorSubject<miReserva[]> = new BehaviorSubject<miReserva[]>([])
  currentReserva = this.miReserva$.asObservable();

  constructor(
    private http:HttpClient
  ) { }

  set setCuartosNoDisponibles (val:string[]){
    this.cuartosNoDisponibles$.next(val)
  }

  addMiReserva(data:miReserva[]){
    this.miReserva$.next(this.miReserva$.getValue().concat(data))
  }

  changeMiReserva(data:miReserva[]){
    this.miReserva$.next(data)
  }

  changeFechaIni(data:Date){
    this.fechaInicial$.next(data);
  }

  changeFechaFinal(data:Date){
    this.fechaFinal$.next(data)
  }

  changeData(data:any){
    this.disponibilidad$.next(data);
  }

  getDisponibilidadBooking(fechaInicial:string, fechaFinal:string, dias:number, hotel:string){

    const params = new HttpParams()
    .set('fechaInicial', fechaInicial)
    .set('fechaFinal', fechaFinal)
    .set('dias',dias)
    .set('hotel',hotel)
    
    return this.http.get<IDisponibilidad[]>(environment.apiUrl+"/disponibilidad/booking",{params:params})
   }

   postDisponibilidadBooking(fechaInicial:string, fechaFinal:string, dias:number, hotel:string){
    const body = {
      fechaInicial, fechaFinal, dias, hotel
    } 
    return this.http.post(environment.apiUrl+"/disponibilidad/booking",body)

   }
}
