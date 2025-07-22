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

  ngOnInit() {

    combineLatest([
      this._disponibilidadService.currentFechaIni,
      this._disponibilidadService.currentFechaFin
    ]).subscribe(([fechaIni, fechaFin]) => {
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

      // Reiniciar subtotal para evitar acumulación indefinida
      this.subtotal = 0;
      this.impuestos = 0;

      if (this.diff && this.diff > 0) {
        for (let i = 0; i < val.length; i++) {
          this.subtotal += val[i].precioTarifa * this.diff;
        }
        this.impuestos = (this.subtotal * 16) / 100;
      }
    });
  }


  pop(index: number) {
    if (index === 0) {
      this.miReserva = []
      this.subtotal = 0
      this.impuestos = 0;
    } else {
      this.miReserva = this.miReserva.splice(index, 1)
    }
    this._disponibilidadService.changeMiReserva(this.miReserva)
  }

}
