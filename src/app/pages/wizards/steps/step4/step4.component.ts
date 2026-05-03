import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { miReserva } from 'src/app/_models/mireserva.model';
import { Promos } from 'src/app/_models/promos.model';
import { HotelConfigService } from 'src/app/_service/hotel-config.service';

@Component({
  selector: 'app-step5',
  templateUrl: './step4.component.html',
  styleUrls: ['./step4.component.scss']
})
export class Step4Component implements OnInit {

  miReserva: miReserva[] = [];
  validatedPromo: Promos | null = null;
  confirmationNumber: string = '';
  hotelNombre: string = '';
  guestEmail: string = '';

  subtotal: number = 0;
  iva: number = 0;
  ish: number = 0;
  total: number = 0;
  totalDescuento: number = 0;

  @Output() honHomeButton = new EventEmitter<void>();

  private readonly MONTHS_ES = [
    'enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre'
  ];

  constructor(
    private _disponibilidadService: DisponibilidadService,
    private _hotelConfig: HotelConfigService,
  ) {}

  ngOnInit(): void {
    this.confirmationNumber = 'HPK-' + Date.now().toString().slice(-8).toUpperCase();
    this.hotelNombre = this._hotelConfig.current?.hotelNombre ?? 'el hotel';
    this.guestEmail = localStorage.getItem('guestEmail') ?? '';

    // Snapshot immediately — getMiReserva() reads the current BehaviorSubject value
    // Deep-clone and ensure fechaInicial/fechaFinal are real Date objects
    const snapshot = this._disponibilidadService.getMiReserva();
    this.miReserva = snapshot.map(r => ({
      ...r,
      fechaInicial: r.fechaInicial ? new Date(r.fechaInicial) : undefined,
      fechaFinal:   r.fechaFinal   ? new Date(r.fechaFinal)   : undefined,
    }));
    this.calcTotals(this.miReserva);

    // Also subscribe for live updates
    this._disponibilidadService.currentReserva.subscribe(reservas => {
      if (reservas.length > 0) {
        this.miReserva = reservas.map(r => ({
          ...r,
          fechaInicial: r.fechaInicial ? new Date(r.fechaInicial) : undefined,
          fechaFinal:   r.fechaFinal   ? new Date(r.fechaFinal)   : undefined,
        }));
        this.calcTotals(this.miReserva);
      }
    });

    this._disponibilidadService.currentValidatedPromo.subscribe(promo => {
      this.validatedPromo = promo;
    });
  }

  // Format date without relying on Angular locale pipe registration
  formatDate(date: Date | undefined): string {
    if (!date) return 'Sin fecha';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Sin fecha';
    const day   = d.getDate().toString().padStart(2, '0');
    const month = this.MONTHS_ES[d.getMonth()];
    const year  = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  calcNights(fechaInicial: Date | undefined, fechaFinal: Date | undefined): number {
    if (!fechaInicial || !fechaFinal) return 0;
    const ms = new Date(fechaFinal).getTime() - new Date(fechaInicial).getTime();
    return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
  }

  calcTotals(reservas: miReserva[]): void {
    this.subtotal = 0;
    this.iva = 0;
    this.ish = 0;
    this.total = 0;
    this.totalDescuento = 0;

    for (const r of reservas) {
      const net = (r.precioTarifa || 0) / 1.19;
      this.subtotal += net;
      this.iva += net * 0.16;
      this.ish += net * 0.03;
      this.total += r.precioTarifa || 0;

      if (r.descuentoAplicado) {
        this.totalDescuento += r.descuentoAplicado;
      }

      for (const pkg of r.packageList ?? []) {
        const pkgNet = (pkg.Precio * pkg.Cantidad) / 1.16;
        this.subtotal += pkgNet;
        this.iva += pkgNet * 0.16;
        this.total += pkg.Precio * pkg.Cantidad;
      }
    }
  }

  backToHome() {
    this.honHomeButton.emit();
  }

  printConfirmation(): void {
    window.print();
  }
}