// _service/booking-reserva.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, firstValueFrom, of, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { DateTime } from 'luxon';

export interface BookingHuesped {
  folio: string;
  adultos: number;
  ninos: number;
  nombre: string;
  estatus: string;
  llegada: string;
  salida: string;
  noches: number;
  tarifa: any;
  porPagar: number;
  pendiente: number;
  origen: string;
  habitacion: string;
  telefono: string;
  email: string;
  creada: string;
  motivo: string;
  fechaNacimiento: string;
  trabajaEn: string;
  tipoDeID: string;
  numeroDeID: string;
  direccion: string;
  pais: string;
  ciudad: string;
  codigoPostal: string;
  lenguaje: string;
  numeroCuarto: string;
  tipoHuesped: string;
  notas: string;
  vip: string;
  ID_Socio: number;
  estatus_Ama_De_Llaves: string;
  desgloseEdoCuenta: { tarifa: string; fecha: string; tarifaTotal: number }[];
  lateCheckOut: string;
  promoCode: string;
}

export interface EmailPayload {
  to: string;
  from: string;
  subject: string;
  nombre: string;
  folio: string;
  llegada: string;
  salida: string;
  reservationCode: string;
}

@Injectable({ providedIn: 'root' })
export class BookingReservaService {

  constructor(private http: HttpClient) {}

  saveHuespedes(huespedArray: BookingHuesped[]): Observable<any> {
    return this.http.post<any>(
      environment.apiUrl + '/huesped/save',
      { huespedInfo: huespedArray }
    );
  }

  saveEstadoCuenta(edoCuenta: any[]): Observable<any> {
    return this.http.post<any>(
      environment.apiUrl + '/edo_cuenta/hospedaje',
      { edoCuenta }
    );
  }

  sendConfirmationEmail(payload: EmailPayload): Observable<any> {
    return this.http.post(environment.apiUrl + '/mail/send', payload).pipe(
      catchError(err => {
        console.error('Email error:', err);
        return of(null); // don't block reservation if email fails
      })
    );
  }

  async processBooking(
    huespedArray: BookingHuesped[],
    tz: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const pago = huespedArray.map(item => ({
        Folio: item.folio,
        Forma_de_Pago: '',
        Fecha: DateTime.now().setZone(tz).toFormat("yyyy-MM-dd'T'HH:mm:ss"),
        Descripcion: 'HOSPEDAJE',
        Cantidad: 1,
        Cargo: item.pendiente,
        Abono: 0,
        Total: item.pendiente,
        Estatus: 'Activo',
        Cajero: 'BOOKING_WEB'
      }));

      // Save huesped + estado de cuenta in parallel
      const [huespedRes] = await firstValueFrom(
        forkJoin([
          this.saveHuespedes(huespedArray).pipe(catchError(e => { console.error(e); return of(null); })),
          this.saveEstadoCuenta(pago).pipe(catchError(e => { console.error(e); return of(null); })),
        ])
      );

      // Send confirmation email
      const emailPayload: EmailPayload = {
        to: huespedArray[0].email,
        from: 'zefraoracle@gmail.com',
        subject: 'Reservación Confirmada — Hotel Pokemon',
        nombre: huespedArray.map(h => h.nombre).join(', '),
        folio: huespedArray.map(h => h.folio).join(', '),
        llegada: huespedArray[0].llegada,
        salida: huespedArray[0].salida,
        reservationCode: huespedArray[0].folio,
      };

      await firstValueFrom(this.sendConfirmationEmail(emailPayload));

      return { success: true };

    } catch (error: any) {
      console.error('Booking process error:', error);
      return { success: false, error: error.message };
    }
  }
}