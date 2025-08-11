import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IDisponibilidad } from '../_models/disponibilidad.model'
import { environment } from 'src/environments/environment';
import { BehaviorSubject, firstValueFrom, map, Observable } from 'rxjs';
import { IHabitaciones } from '../_models/habitaciones.model';
import { DateTime } from 'luxon'
import { miReserva } from '../_models/mireserva.model';
import { ICalendario } from '../_models/calendario.model';
import { Bloqueo } from '../_models/bloqueos.model';
import { Habitacion } from '../_models/habitacion.model';
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

  private adultos$: BehaviorSubject<number> = new BehaviorSubject<number>(1)
  currentAdultosValue = this.adultos$.asObservable();

  private numeroHabs$: BehaviorSubject<number> = new BehaviorSubject<number>(1)
  currentNumHabs = this.numeroHabs$.asObservable();

  private miReserva$: BehaviorSubject<miReserva[]> = new BehaviorSubject<miReserva[]>([])
  currentReserva = this.miReserva$.asObservable();

  constructor(
    private http:HttpClient
  ) { }

  set setCuartosNoDisponibles (val:string[]){
    this.cuartosNoDisponibles$.next(val)
  }

getMiReserva() {
  return this.miReserva$.value; 
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

  changeAdultos(value:number){
    this.adultos$.next(value)
  }

  changeCurrentNumeroHabs(value:number){
    this.numeroHabs$.next(value)
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

    const nights = endDateLuxon.startOf('day').diff(initialDateLuxon.startOf('day'), 'days').days;

    const params ={
      initialDate:initialDateLuxonISOString,
      endDate:endDateLuxonISOString,
      codigoCuarto:'1',
      numCuarto:'1',
      cuarto:'1',
      dias:nights.toString(),
      folio:'No Folio',
      codigo:currentSearch.codigoPromo
    }

    return this.http.post<any>(environment.apiUrl + '/disponibilidad/reservas', {params})
    .pipe(
        map(responseData=>{
         return responseData
      })
      )
  }

    async calcHabitacionesDisponibles(response:any,intialDate:Date,endDate:Date, cuarto:string){
        const ocupadasSet = new Set(response);

        const bloqueosArray = await firstValueFrom(this.getAllBloqueos());

        // Normalize initialDate and endDate
        const normalizedInitialDate = this.normalizeDate(intialDate);
        const normalizedEndDate = this.normalizeDate(endDate);

        // Filter and add 'Cuarto' strings within the overlapping date range to the set
        bloqueosArray.forEach((bloqueo:Bloqueo) => {
          const { Desde, Hasta, Cuarto } = bloqueo;

          // Convert ISO strings to Date objects
          const desdeDate = new Date(Desde);
          const hastaDate = new Date(Hasta);

          // Normalize the dates to ignore time components
          const normalizedDesdeDate = this.normalizeDate(desdeDate);
          const normalizedHastaDate = this.normalizeDate(hastaDate);

          // Check for overlapping conditions
          const isOverlapping =
            // Case 1: The arrival date (Desde) is within the provided range
            (normalizedDesdeDate >= normalizedInitialDate && normalizedDesdeDate < normalizedEndDate) ||
            // Case 2: The departure date (Hasta) is within the provided range
            (normalizedHastaDate >= normalizedInitialDate && normalizedHastaDate <= normalizedEndDate) ||
            // Case 3: The reservation completely encompasses the provided range
            (normalizedDesdeDate < normalizedInitialDate && normalizedHastaDate > normalizedEndDate);

          // If there is an overlap, add Cuarto to the set
          if (isOverlapping && bloqueo.Completed === false) {
            Cuarto.forEach(cuarto => {
              ocupadasSet.add(cuarto);
            });
          }
        });
        const roomCodesComplete = await firstValueFrom(this.getAllHabitaciones());
        // Filtrar las habitaciones disponibles
        const habitacionesDisponibles = roomCodesComplete.filter(habitacion => !ocupadasSet.has(habitacion.Numero));
        // Paso 1: Crear el array preAsignadasArray
        let preAsignadasArray

        preAsignadasArray = habitacionesDisponibles.map(item => ({
          numero: item.Numero,
          codigo: item.Codigo,
          checked: false,
          disabled: true
        }));

        // Paso 2: Filtrar para obtener solo un objeto único por cada 'Codigo'
        if(cuarto === '1'){
          const habitacionesUnicas:any = {};
          habitacionesDisponibles.forEach(habitacion => {
          if (!habitacionesUnicas[habitacion.Codigo]) {
            habitacionesUnicas[habitacion.Codigo] = habitacion;
          }
        });
        const habitacionesUnicasArray:Habitacion[] = Object.values(habitacionesUnicas);

        const responseObj = {
            avaibilityRooms : [...habitacionesUnicasArray],
            preAsignadasArray: preAsignadasArray
        }
        this.disponibilidad$.next(responseObj.avaibilityRooms)

        return responseObj
        

        }else{
            const responseObj = {
                avaibilityRooms : [...habitacionesDisponibles],
                preAsignadasArray: preAsignadasArray
            }
                    this.disponibilidad$.next(responseObj.avaibilityRooms)

            return responseObj 
        }
    }

    getAllBloqueos():Observable<Bloqueo[]>{
      return this.http
       .get<Bloqueo[]>(environment.apiUrl + '/bloqueos/getAll')
       .pipe(
         map(responseData=>{
          const postArray = []
           for(const key in responseData){
             if(responseData.hasOwnProperty(key))
             postArray.push(responseData[key]);
            }  
            return responseData
       })
       )
    }

  getAllHabitaciones() :Observable<Habitacion[]> {
    return this.http
     .get<Habitacion[]>(environment.apiUrl + '/habitaciones')
     .pipe(
       map(responseData=>{
        const postArray = []
         for(const key in responseData)
         {
           if(responseData.hasOwnProperty(key))
           postArray.push(responseData[key]);
          }
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

       /**
   *Converts Date Object to 00:00 so time its equaly asigned
   *
   * @param {Date} date
   * @return {*}  {Date}
   * @memberof NvaReservaComponent
   */
  normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
