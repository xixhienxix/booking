import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IDisponibilidad } from '../_models/disponibilidad.model'
import { environment } from 'src/environments/environment';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { IHabitaciones } from '../_models/habitaciones.model';
import { DateTime } from 'luxon'
import { miReserva } from '../_models/mireserva.model';
import { ICalendario } from '../_models/calendario.model';
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

  getDisponibilidad(currentSearch:ICalendario) :Observable<any>{
    //initialDate:Date, endDate:Date, habitacion: IHabitaciones | string, dias:number, folio:strin
    const initialDateLuxon = DateTime.fromJSDate(currentSearch.fechaInicial, { zone: 'America/Mexico_City' }).setLocale('es-MX');
    const endDateLuxon = DateTime.fromJSDate(currentSearch.fechaFinal, { zone: 'America/Mexico_City' }).setLocale('es-MX');

    // Get ISO string
    const initialDateLuxonISOString = initialDateLuxon.toISO();
    const endDateLuxonISOString = endDateLuxon.toISO();

    const params = {
        initialDate:initialDateLuxonISOString,
        endDate:endDateLuxonISOString,
    }

    return this.http.post<any>(environment.apiUrl + '/disponibilidad/reservas', {params})
    .pipe(
        map(responseData=>{
         return responseData
      })
      )
  }

   postDisponibilidadBooking(fechaInicial:string, fechaFinal:string, dias:number, hotel:string){
    const body = {
      fechaInicial, fechaFinal, dias, hotel
    } 
    return this.http.post(environment.apiUrl+"/disponibilidad/booking",body)

   }
}
