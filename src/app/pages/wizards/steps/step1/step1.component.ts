import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DateTime } from 'luxon'
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { ICalendario } from 'src/app/_models/calendario.model';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { SpinnerService } from 'src/app/_service/spinner.service';
import { HabitacionesService } from 'src/app/_service/habitacion.service';

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
  // @Output() buscaDisponibilidad : EventEmitter<boolean> = new EventEmitter<boolean>(false);
  @Output() honSubmit: EventEmitter<any> = new EventEmitter();

  fechaInicial:Date
  fechaFinal:Date
  listaHoteles:string[]=[]

  codigoPromocional = '';

  form: FormGroup;
  private unsubscribe: Subscription[] = [];

  constructor(private fb: FormBuilder,
    private spinnerLoading : SpinnerService, 
    private _disponibilidadService:DisponibilidadService,
    private _habitacionService:HabitacionesService) {}

    get f(){  
      return this.form.controls;  
    }

  ngOnInit() {
    this.initForm();
  
    this._habitacionService.getHoteles().subscribe(
      (val)=>{
        for(let i=0; i<val.length;i++){
          this.listaHoteles.push(val[i])
        }
    })
    this.updateParentModel({}, true);
  }

  initForm() {
    this.form = new FormGroup({
      fechaInicialForm: new FormControl(new Date(year, month, today.getDate())),
      fechaFinalForm: new FormControl(new Date(year, month, today.getDate()+1)),
      codigoPromo : new FormControl(''),
      adultos: new FormControl(1),
      ninos: new FormControl(0),
      hotel: new FormControl('')
    });
    this.updateParentModel(
        {
          fechaFinal:this.form.controls["fechaInicialForm"].value,
          fechaInicial:this.form.controls["fechaInicialForm"].value, 
          codigoPromo:this.form.controls["codigoPromo"].value, 
          adultos:this.form.controls["adultos"].value, 
          ninos:this.form.controls["ninos"].value, 
          hotel: this.form.controls["hotel"].value
        },true)

    this.form.controls['adultos'].setValue(1, {onlySelf: true});
    this.form.controls['ninos'].setValue(0, {onlySelf: true});

    const formChangesSubscr = this.form.valueChanges.subscribe((val) => {
      const fechaInicial=new Date(val.fechaInicialForm)
      this.fechaInicial=fechaInicial
      this._disponibilidadService.changeFechaIni(fechaInicial)

      const fechaFinalC=new Date(val.fechaFinalForm)
      this.fechaFinal=fechaFinalC
      this._disponibilidadService.changeFechaFinal(fechaFinalC)

      this.updateParentModel({fechaFinal:this.fechaFinal,fechaInicial:this.fechaInicial, codigoPromo:val.codigoPromo, adultos:val.adultos, ninos:val.ninos, hotel: val.hotel},true)
    });

    this.unsubscribe.push(formChangesSubscr);
    this.spinnerLoading.loadingState = false
  }

  categoryOnChange(e:any){
    this.updateParentModel({hotel:e.target.value},true)
    console.log(e.target.value)
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
