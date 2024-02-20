import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription, concat } from 'rxjs';
import { DateTime } from 'luxon'
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { ICalendario } from 'src/app/_models/calendario.model';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';

const today = new Date();
const month = today.getMonth();
const year = today.getFullYear();

// See the Moment.js docs for the meaning of these formats:
// https://momentjs.com/docs/#/displaying/format/
export const MY_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'LL',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};
@Component({
  selector: 'app-detalle-reserva',
  templateUrl: './detalle-reserva.component.html',
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
    },
    {provide: MAT_DATE_FORMATS, useValue: MY_FORMATS},
  ],
})
export class DetalleReservaComponent implements OnDestroy, OnInit {
  @Input('updateParentModel') updateParentModel: (
    part: Partial<ICalendario>,
    isFormValid: boolean
  ) => void;
  @Output() buscaDisponibilidad : EventEmitter<boolean> = new EventEmitter<boolean>(false);

  fechaInicial:Date
  fechaFinal:Date

  codigoPromocional = '';

  form: FormGroup;
  private unsubscribe: Subscription[] = [];

  constructor(private fb: FormBuilder,
    private _disponibilidadService: DisponibilidadService) {}

  ngOnInit() {
    this._disponibilidadService.currentFechaIni.subscribe(val=>{
      this.fechaInicial=val
    })
    this._disponibilidadService.currentFechaFin.subscribe(val=>{
      this.fechaFinal=val
    })

    this.initForm();
    this.updateParentModel({}, true);
  }


  initForm() {

    this.form = new FormGroup({
      fechaInicialForm: new FormControl(new Date(year, month, today.getDate())),
      fechaFinalForm: new FormControl(new Date(year, month, today.getDate()+1)),
      codigoPromo : new FormControl('')
    });

    const formChangesSubscr = this.form.valueChanges.subscribe((val) => {
      this.codigoPromocional=val.codigoPromo

      const fechaInicial=new Date(val.fechaInicialForm)
      this.fechaInicial=fechaInicial
      this._disponibilidadService.changeFechaIni(fechaInicial)

      const fechaFinalC=new Date(val.fechaFinalForm)
      this.fechaFinal=fechaFinalC
      this._disponibilidadService.changeFechaFinal(fechaFinalC)
      // const fechaInicialC=new Date(val.fechaInicialForm).toISOString()
      // this.fechaInicial=DateTime.fromISO(fechaInicialC);
      // this._disponibilidadService.changeFechaIni(this.fechaInicial)

      // const fechaFinalC=new Date(val.fechaFinalForm).toISOString()
      // this.fechaFinal=DateTime.fromISO(fechaFinalC);
      // this._disponibilidadService.changeFechaFinal(this.fechaFinal)
    });

    this.unsubscribe.push(formChangesSubscr);

  }

  buscaDispo(){
    this.updateParentModel({fechaFinal:this.fechaFinal,fechaInicial:this.fechaInicial, codigoPromo:this.codigoPromocional},true)
    this.buscaDisponibilidad.emit(true)
    this._disponibilidadService.changeFechaFinal(this.fechaFinal)
    this._disponibilidadService.changeFechaIni(this.fechaInicial)
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
