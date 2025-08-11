import { Component, OnInit } from '@angular/core';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { DateTime } from 'luxon'
import { combineLatest, concat, forkJoin } from 'rxjs';
import { miReserva } from 'src/app/_models/mireserva.model';
@Component({
  selector: 'app-reserva',
  templateUrl: './reserva.component.html',
  styleUrls: ['./reserva.component.scss']
})
export class ReservaComponent implements OnInit {
  constructor(private _disponibilidadService: DisponibilidadService
  ) {
  }

  fechaInicial: string = ''
  fechaFinal: string = ''
  diff: number
  fechaIniDateTime: DateTime;
  FechaFinDateTime: DateTime;
  miReserva: miReserva[] = [];
  subtotal: number = 0;
  impuestos: number = 0;
  habs: number = 1
  iva: number = 0;
  ish: number = 0;
  total: number = 0;

  ngOnInit() {

    combineLatest([
      this._disponibilidadService.currentFechaIni,
      this._disponibilidadService.currentFechaFin,
      this._disponibilidadService.currentNumHabs
    ]).subscribe(([fechaIni, fechaFin, numeroHabs]) => {
      if (numeroHabs) {
        this.habs = numeroHabs
      }
      if (fechaIni && fechaFin) {
        this.fechaIniDateTime = DateTime.fromJSDate(fechaIni);
        this.FechaFinDateTime = DateTime.fromJSDate(fechaFin);

        const diff = this.FechaFinDateTime.diff(this.fechaIniDateTime, ["days"]).toObject().days;
        this.diff = diff ?? 0;
      } else {
        this.diff = 0;
      }
    });


    this._disponibilidadService.currentReserva.subscribe(val => {
      this.miReserva = val;

      this.subtotal = 0;
      this.impuestos = 0;
      this.iva = 0;
      this.ish = 0;
      this.total = 0;

      if (this.diff && this.diff > 0) {
        for (let reserva of val) {
          // Room price with taxes included
          const totalRoomWithTaxes = reserva.precioTarifa || 0;

          // Calculate net price of room (price without IVA and ISH)
          // Since room includes 16% IVA and 3% ISH => total factor = 1 + 0.16 + 0.03 = 1.19
          const netRoomPrice = totalRoomWithTaxes / 1.19;

          // Add net room price to subtotal
          this.subtotal += netRoomPrice;

          // IVA and ISH from room
          this.iva += netRoomPrice * 0.16;
          this.ish += netRoomPrice * 0.03;

          // Add room total to grand total
          this.total += totalRoomWithTaxes;

          // Now handle packages inside this reserva
          if (reserva.packageList && reserva.packageList.length > 0) {
            for (let pkg of reserva.packageList) {
              const packageTotalWithIva = (pkg.Precio || 0) * (pkg.Cantidad || 1);

              // Packages have only IVA 16%
              const netPackagePrice = packageTotalWithIva / 1.16;

              this.subtotal += netPackagePrice;
              this.iva += netPackagePrice * 0.16;

              // No ISH on packages

              // Add package total to grand total
              this.total += packageTotalWithIva;
            }
          }
        }

        this.impuestos = this.iva + this.ish;
      }
    });

  }

  popPackage(reservaIndex: number, packageIndex: number) {
    const reserva = this.miReserva[reservaIndex];
    if (reserva && reserva.packageList) {
      reserva.packageList.splice(packageIndex, 1);
      // Emit the updated array so subscribers recalc totals
      this._disponibilidadService.changeMiReserva(this.miReserva);
    }
  }




  pop(index: number) {
    if (index === 0) {
      this.miReserva = []
      this.subtotal = 0
      this.impuestos = 0;
    } else {
      this.miReserva.splice(index, 1)
    }
    this._disponibilidadService.changeMiReserva(this.miReserva)
  }

}
