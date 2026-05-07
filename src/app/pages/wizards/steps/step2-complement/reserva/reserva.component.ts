import { Component, OnInit } from '@angular/core';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { miReserva } from 'src/app/_models/mireserva.model';
import { Promos } from 'src/app/_models/promos.model';

@Component({
  selector: 'app-reserva',
  templateUrl: './reserva.component.html',
  styleUrls: ['./reserva.component.scss']
})
export class ReservaComponent implements OnInit {

  miReserva: miReserva[] = [];
  subtotal: number = 0;
  impuestos: number = 0;
  iva: number = 0;
  ish: number = 0;
  total: number = 0;
  validatedPromo: Promos | null = null;

  constructor(private _disponibilidadService: DisponibilidadService) {}

  ngOnInit() {
    this._disponibilidadService.currentValidatedPromo.subscribe(promo => {
      this.validatedPromo = promo;
    });

    this._disponibilidadService.currentReserva.subscribe(val => {
      this.miReserva = val;
      this.recalcTotals(val);
    });
  }

  // Nights per room
  calcNights(fechaInicial: Date | undefined, fechaFinal: Date | undefined): number {
    if (!fechaInicial || !fechaFinal) return 0;
    const ms = new Date(fechaFinal).getTime() - new Date(fechaInicial).getTime();
    return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
  }

  /** Sum of all packages for a single room */
  calcExtrasTotal(reserva: miReserva): number {
    return reserva.packageList?.reduce((s, p) => s + (p.Precio || 0) * (p.Cantidad || 1), 0) ?? 0;
  }

  /** Total per room = hospedaje + extras */
  calcRoomTotal(reserva: miReserva): number {
    return (reserva.precioTarifa || 0) + this.calcExtrasTotal(reserva);
  }

  private recalcTotals(val: miReserva[]) {
    this.subtotal = 0;
    this.impuestos = 0;
    this.iva = 0;
    this.ish = 0;
    this.total = 0;

    for (const reserva of val) {
      // Room price already includes IVA 16% + ISH 3% = factor 1.19
      const totalRoomWithTaxes = reserva.precioTarifa || 0;
      const netRoomPrice = totalRoomWithTaxes / 1.19;

      this.subtotal += netRoomPrice;
      this.iva += netRoomPrice * 0.16;
      this.ish += netRoomPrice * 0.03;
      this.total += totalRoomWithTaxes;

      // Packages — IVA 16% only
      for (const pkg of reserva.packageList ?? []) {
        const pkgTotal = (pkg.Precio || 0) * (pkg.Cantidad || 1);
        const netPkg = pkgTotal / 1.16;
        this.subtotal += netPkg;
        this.iva += netPkg * 0.16;
        this.total += pkgTotal;
      }
    }

    this.impuestos = this.iva + this.ish;
  }

  removePromo(): void {
    this._disponibilidadService.changeValidatedPromo(null);
  }

  popPackage(reservaIndex: number, packageIndex: number) {
    const reserva = this.miReserva[reservaIndex];
    if (reserva?.packageList) {
      reserva.packageList.splice(packageIndex, 1);
      this._disponibilidadService.changeMiReserva(this.miReserva);
    }
  }

  pop(index: number) {
    if (index === 0 && this.miReserva.length === 1) {
      this.miReserva = [];
    } else {
      this.miReserva.splice(index, 1);
    }
    this._disponibilidadService.changeMiReserva(this.miReserva);
  }
}