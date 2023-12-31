import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DateTime } from 'luxon'
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { ICalendario } from 'src/app/_models/calendario.model';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { SpinnerService } from 'src/app/_service/spinner.service';

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
  selector: 'app-step1',
  templateUrl: './step1.component.html',
  styleUrls: ['./step1.component.scss'],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
    },
    {provide: MAT_DATE_FORMATS, useValue: MY_FORMATS},
  ],
})
export class Step1Component implements OnInit, OnDestroy {
  @Input('updateParentModel') updateParentModel: (
    part: Partial<ICalendario>,
    isFormValid: boolean
  ) => void;
  @Output() buscaDisponibilidad : EventEmitter<boolean> = new EventEmitter<boolean>(false);

  fechaInicial:DateTime
  fechaFinal:DateTime

  codigoPromocional = '';

  form: FormGroup;
  private unsubscribe: Subscription[] = [];

  constructor(private fb: FormBuilder,
    private spinnerLoading : SpinnerService, 
    private _disponibilidadService:DisponibilidadService) {}

  ngOnInit() {
    this.initForm();
    this.updateParentModel({}, true);
  }

  initForm() {
    this.form = new FormGroup({
      fechaInicialForm: new FormControl(new Date(year, month, today.getDate())),
      fechaFinalForm: new FormControl(new Date(year, month, today.getDate()+1)),
      codigoPromo : new FormControl(''),
      adultos: new FormControl(),
      ninos: new FormControl()
    });

    this.form.controls['adultos'].setValue(1, {onlySelf: true});
    this.form.controls['ninos'].setValue(0, {onlySelf: true});

    const formChangesSubscr = this.form.valueChanges.subscribe((val) => {
      const fechaInicialC=new Date(val.fechaInicialForm).toISOString()
      this.fechaInicial=DateTime.fromISO(fechaInicialC);
      this._disponibilidadService.changeFechaIni(this.fechaInicial)

      const fechaFinalC=new Date(val.fechaFinalForm).toISOString()
      this.fechaFinal=DateTime.fromISO(fechaFinalC);
      this._disponibilidadService.changeFechaFinal(this.fechaFinal)

      this.updateParentModel({fechaFinal:this.fechaFinal,fechaInicial:this.fechaInicial, codigoPromo:val.codigoPromo, adultos:val.adultos, ninos:val.ninos},true)
      this.buscaDisponibilidad.emit(true)
    });

    this.unsubscribe.push(formChangesSubscr);
    this.spinnerLoading.loadingState = false
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
