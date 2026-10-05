// _service/booking-reserva.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, firstValueFrom, of, catchError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DateTime } from 'luxon';
import { HotelConfigService } from './hotel-config.service';
import { shareReplay, map } from 'rxjs/operators';

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
  subject: string;
  nombre: string;
  folio: string;
  llegada: string;
  salida: string;
  reservationCode: string;
}

@Injectable({ providedIn: 'root' })
export class BookingReservaService {

private lastEmailPayload: EmailPayload | null = null;
emailSent = false;

  constructor(private http: HttpClient, private _hotelConfig: HotelConfigService ) {}
  private prefix$?: Observable<string>;

  saveHuespedes(huespedArray: BookingHuesped[]): Observable<any> {
    return this.http.post<any>(
      this._hotelConfig.current?.apiUrl + '/huesped/save',
      { huespedInfo: huespedArray }
    );
  }

  saveEstadoCuenta(edoCuenta: any[]): Observable<any> {
    return this.http.post<any>(
      this._hotelConfig.current?.apiUrl + '/edo_cuenta/hospedaje',
      { edoCuenta }
    );
  }

  sendConfirmationEmail(payload: EmailPayload): Observable<any> {
    return this.http.post(this._hotelConfig.current?.apiUrl + '/mail/send', payload).pipe(
      catchError(err => {
        console.error('Email error:', err);
        return of(null); // don't block reservation if email fails
      })
    );
  }

  async processBooking(
    huespedArray: BookingHuesped[],
    tz: string
  ): Promise<{ success: boolean; emailSent?: boolean; error?: string }> {
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

      // 1) Save huesped + estado de cuenta in parallel
      await firstValueFrom(
        forkJoin([
          this.saveHuespedes(huespedArray).pipe(
            catchError(e => { console.error('saveHuespedes error:', e); return of(null); })
          ),
          this.saveEstadoCuenta(pago).pipe(
            catchError(e => { console.error('saveEstadoCuenta error:', e); return of(null); })
          ),
        ])
      );

      // 2) Promo inventory
      const promoCode = huespedArray[0]?.promoCode;
      if (promoCode) {
        await firstValueFrom(
          this.decrementInventario(promoCode).pipe(
            catchError(e => { console.error('Promo decrement error:', e); return of(null); })
          )
        );
      }

      // 3) Reservation code = PREFIX-folio (falls back to the raw folio)
      let reservationCode = huespedArray[0].folio;
      try {
        const prefix = await firstValueFrom(this.getHotelPrefix());
        reservationCode = this.buildReservationCode(prefix, huespedArray[0].folio);
      } catch (e) {
        console.error('Could not fetch hotel prefix, using raw folio', e);
      }
      localStorage.setItem('reservationCode', reservationCode);

      // 4) Confirmation email (backend picks the hotel sender, then the fallback)
      const emailPayload: EmailPayload = {
        to: huespedArray[0].email,
        subject: 'Reservación Confirmada',
        nombre: huespedArray.map(h => h.nombre).join(', '),
        folio: huespedArray.map(h => h.folio).join(', '),
        llegada: huespedArray[0].llegada,
        salida: huespedArray[0].salida,
        reservationCode,
      };

      this.lastEmailPayload = emailPayload;
      const res = await firstValueFrom(this.sendConfirmationEmail(emailPayload));
      this.emailSent = res !== null;

      return { success: true, emailSent: this.emailSent };

    } catch (error: any) {
      console.error('Booking process error:', error);
      return { success: false, error: error.message };
    }
  }

  decrementInventario(codigo: string): Observable<any> {
    return this.http.patch(this._hotelConfig.current?.apiUrl + `/promos/${codigo}/inventario`, {});
  }

  getHotelPrefix(): Observable<string> {
    if (!this.prefix$) {
      this.prefix$ = this.http
        .get<{ prefix: string }>(this._hotelConfig.current?.apiUrl + '/hotel/prefix')
        .pipe(map(r => r.prefix), shareReplay(1));
    }
    return this.prefix$;
  }

  resendConfirmation(): Observable<{ ok: boolean; via?: string }> {
    if (!this.lastEmailPayload) return of({ ok: false });

    return this.http
      .post<{ via?: string }>(
        this._hotelConfig.current?.apiUrl + '/mail/send',
        this.lastEmailPayload
      )
      .pipe(
        map(r => ({ ok: true, via: r?.via })),
        catchError(err => {
          console.error('Resend error:', err);
          return of({ ok: false });
        })
      );
  }

  buildReservationCode(prefix: string, code: string): string {
    return `${prefix}-${code}`;
  }
}