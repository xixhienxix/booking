// step5.component.ts — complete fixed version
import { Component, OnInit } from '@angular/core';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { miReserva } from 'src/app/_models/mireserva.model';
import { Promos } from 'src/app/_models/promos.model';
import { DateTime } from 'luxon';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-step5',
  templateUrl: './step4.component.html',
  styleUrls: ['./step4.component.scss']
})
export class Step4Component implements OnInit {

  miReserva: miReserva[] = [];
  validatedPromo: Promos | null = null;
  confirmationNumber: string = '';

  checkIn: Date;
  checkOut: Date;
  checkInFormatted: string = '';
  checkOutFormatted: string = '';
  nights: number = 0;
  adultos: number = 1;
  ninos: number = 0;
  guestEmail: string = '';

  subtotal: number = 0;
  iva: number = 0;
  ish: number = 0;
  total: number = 0;
  totalDescuento: number = 0;

  constructor(private _disponibilidadService: DisponibilidadService) {}

  ngOnInit(): void {
    this.confirmationNumber = 'HPK-' + Date.now().toString().slice(-8).toUpperCase();

    // ── Dates ──
    combineLatest([
      this._disponibilidadService.currentFechaIni,
      this._disponibilidadService.currentFechaFin,
    ]).subscribe(([ini, fin]) => {
      this.checkIn = ini;
      this.checkOut = fin;

      const iniLuxon = DateTime.fromJSDate(ini).setLocale('es-MX');
      const finLuxon = DateTime.fromJSDate(fin).setLocale('es-MX');

      this.checkInFormatted = iniLuxon.toFormat('cccc dd MMMM yyyy');
      this.checkOutFormatted = finLuxon.toFormat('cccc dd MMMM yyyy');
      this.nights = Math.round(finLuxon.diff(iniLuxon, 'days').days);
    });

    // ── Reserva list + totals — same source as app-reserva ──
    this._disponibilidadService.currentReserva.subscribe(reservas => {
      this.miReserva = reservas;
      this.calcTotals(reservas);
    });

    // ── Validated promo — same source as app-reserva ──
    this._disponibilidadService.currentValidatedPromo.subscribe(promo => {
      this.validatedPromo = promo;
    });

    // ── Guest count ──
    this._disponibilidadService.currentAdultosValue.subscribe(val => {
      this.adultos = val;
    });

    // ── Guest email saved in step3 ──
    this.guestEmail = localStorage.getItem('guestEmail') ?? '';
  }

  calcTotals(reservas: miReserva[]): void {
    this.subtotal = 0;
    this.iva = 0;
    this.ish = 0;
    this.total = 0;
    this.totalDescuento = 0;

    for (const r of reservas) {
      // Same tax logic as app-reserva (rooms: IVA 16% + ISH 3% = 1.19)
      const net = (r.precioTarifa || 0) / 1.19;
      this.subtotal += net;
      this.iva += net * 0.16;
      this.ish += net * 0.03;
      this.total += r.precioTarifa || 0;

      // Track total discount across all rooms
      if (r.descuentoAplicado) {
        this.totalDescuento += r.descuentoAplicado;
      }

      // Packages (IVA 16% only)
      for (const pkg of r.packageList ?? []) {
        const pkgNet = (pkg.Precio * pkg.Cantidad) / 1.16;
        this.subtotal += pkgNet;
        this.iva += pkgNet * 0.16;
        this.total += pkg.Precio * pkg.Cantidad;
      }
    }
  }

  printConfirmation(): void {
    window.print();
  }
}