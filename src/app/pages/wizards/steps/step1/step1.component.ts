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
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { environment } from '../../../../../environments/environment';
import { dateRangeValidator } from 'src/app/_helpers/custom-validators/date-range.validator';

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
  styleUrls: ['./step1.component.scss']
})
export class Step1Component implements OnInit, OnDestroy {
  @Input('updateParentModel') updateParentModel: (part: Partial<ICalendario>, isFormValid: boolean) => void;
  @Output() honSubmit: EventEmitter<any> = new EventEmitter();
  @Output() quantityChanged = new EventEmitter<{ qty: number; qtyNin: number }>();


  fechaInicial: Date;
  fechaFinal: Date;
  listaHoteles: string[] = ['Hotel Pokemon'];
  codigoPromocional = '';

  quantityNin:number=0;
  quantity:number=1;
  hotelId: string = environment.hotelID;

    /** Dates */
    intialDateFC = new FormControl(null);
    endDateFC = new FormControl(null);
    intialDate: Date | null = null;
    endDate: Date | null = null;
    minDate: Date = new Date(); // Set minDate to today's date
  
    intialDateEvent: string[] = [];
    endDateEvent: string[] = [];
    stayNights:number=1;

    formGroup: FormGroup;
  private unsubscribe: Subscription[] = [];

  @Output() formValid: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor(
    private fb: FormBuilder,
    private spinnerLoading: SpinnerService,
    private _disponibilidadService: DisponibilidadService,
  ) {
    this.formGroup = this.fb.group({
      adultos: [1, Validators.required],
      ninos: [0, Validators.required],
      fechaInicialForm: [null, Validators.required],
      fechaFinalForm: [null, Validators.required],
      codigoPromo: [''],
      hotel: []
    }, { validators: dateRangeValidator }); 

    this.spinnerLoading.loadingState = false;
  }

  get f() {
    return this.formGroup.controls;
  }

  ngOnInit() {
    this._disponibilidadService.changeMiReserva([])
    this.formGroup.controls["hotel"].patchValue(this.hotelId);
    console.log('his.formGroup.controls["hotel"]:', this.formGroup.controls["hotel"]?.value);

    this.formGroup.statusChanges.subscribe(status => {
      console.log('Form status:', status);
      if (status === 'VALID') {
        this.updateParentModel({}, this.formGroup.valid);
      }
    });
  
    // Subscribe to valueChanges to handle changes dynamically
    this.formGroup.valueChanges.subscribe(value => {
      localStorage.setItem('HOTEL',value.hotel);
      console.log('Form values:', value);
      this.emitFormValues();
    });
  }


  //**DatePicker */
addEventIntialDate(type: string, event: MatDatepickerInputEvent<Date>) {
  this.intialDateEvent = [];
  this.intialDateEvent.push(`${type}: ${event.value}`);
  this.intialDate = new Date(event.value!);

  this._disponibilidadService.changeFechaIni(this.intialDate);
}

addEventEndDate(type: string, event: MatDatepickerInputEvent<Date>) {
  this.endDateEvent = [];
  this.endDateEvent.push(`${type}: ${event.value}`);
  this.endDate = new Date(event.value!);

  this._disponibilidadService.changeFechaFinal(this.endDate);

  if (this.intialDate && this.endDate) {
    let Difference_In_Time = this.endDate.getTime() - this.intialDate.getTime();
    this.stayNights = Math.ceil(Difference_In_Time / (1000 * 3600 * 24));
  }
}

  
adjustQuantity(operation: 'plus' | 'minus', min: number, controlName: string) {
  const control = this.formGroup.get(controlName);

  if (!control) return;

  let current = control.value || 0;

  if (operation === 'plus') {
    current += 1;
  } else if (operation === 'minus' && current > min) {
    current -= 1;
  }

  control.setValue(current);
    // Emit updated values
  this.quantityChanged.emit({
    qty: this.formGroup.get('adultos')?.value,
    qtyNin: this.formGroup.get('ninos')?.value
  });
}

plus() {
  this.adjustQuantity('plus', 1, 'adultos');
}

minus() {
  this.adjustQuantity('minus', 1, 'adultos');
}

plusNin() {
  this.adjustQuantity('plus', 0, 'ninos');
}

minusNin() {
  this.adjustQuantity('minus', 0, 'ninos');
}


  

  isControlValid(controlName: string): boolean {
    const control = this.formGroup.controls[controlName];
    return control.valid && (control.dirty || control.touched);
  }

  isControlInvalid(controlName: string): boolean {
    const control = this.formGroup.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  controlHasError(validation:any, controlName:string): boolean {
    const control = this.formGroup.controls[controlName];
    return control.hasError(validation) && (control.dirty || control.touched);
  }

  // private loadHoteles() {
  //   this.habitacionService.getHoteles().subscribe(hoteles => {
  //     this.listaHoteles = [...hoteles];
  //   });
  // }

  emitFormValues() {
    const { fechaInicialForm, fechaFinalForm, codigoPromo, adultos, ninos, hotel } = this.formGroup.value;
    this.updateParentModel({
      fechaInicial: new Date(fechaInicialForm),
      fechaFinal: new Date(fechaFinalForm),
      codigoPromo,
      adultos,
      ninos,
      hotel
    }, this.formGroup.valid);
  }

  // Handle dropdown change
  categoryOnChange(event: any) {
    this.updateParentModel({ hotel: event.value }, this.formGroup.valid);
  }

  ngOnDestroy() {
    this.unsubscribe.forEach(sub => sub.unsubscribe());
  }
}

