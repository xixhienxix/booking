import { Component, OnInit } from '@angular/core';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { miReserva } from 'src/app/_models/mireserva.model';
import { Promos } from 'src/app/_models/promos.model';
import { ParametersService } from 'src/app/_service/parameters.service';
import { combineLatest, Subject, takeUntil } from 'rxjs';

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
  ishPercent = 0;
  private readonly IVA_RATE = 0.16;
  private destroy$ = new Subject<void>();

  constructor(private _disponibilidadService: DisponibilidadService,
    private _parametrosService: ParametersService
  ) {}

  ngOnInit() {
    this._disponibilidadService.currentValidatedPromo
      .pipe(takeUntil(this.destroy$))
      .subscribe(promo => (this.validatedPromo = promo));

    // Recalculate whenever the reservation OR the parameters change
    combineLatest([
      this._disponibilidadService.currentReserva,
      this._parametrosService.parametersFront$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([reserva, params]) => {
        this.ishPercent = params.ish ?? 0;
        this.miReserva = reserva;
        this.recalcTotals(reserva);
      });

    // Only needed if nothing else (e.g. APP_INITIALIZER) already loads them
    this._parametrosService.getFrontParameters().subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

    const ishRate = this.ishPercent / 100;
    const roomTaxFactor = 1 + this.IVA_RATE + ishRate;

    for (const reserva of val) {
      // Room price already includes IVA + ISH
      const totalRoomWithTaxes = reserva.precioTarifa || 0;
      const netRoomPrice = totalRoomWithTaxes / roomTaxFactor;

      this.subtotal += netRoomPrice;
      this.iva += netRoomPrice * this.IVA_RATE;
      this.ish += netRoomPrice * ishRate;
      this.total += totalRoomWithTaxes;

      // Packages: IVA only
      for (const pkg of reserva.packageList ?? []) {
        const pkgTotal = (pkg.Precio || 0) * (pkg.Cantidad || 1);
        const netPkg = pkgTotal / (1 + this.IVA_RATE);
        this.subtotal += netPkg;
        this.iva += netPkg * this.IVA_RATE;
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