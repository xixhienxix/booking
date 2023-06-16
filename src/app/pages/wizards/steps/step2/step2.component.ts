import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { ICalendario } from 'src/app/_models/calendario.model';
import { IDisponibilidad } from 'src/app/_models/disponibilidad.model';
import { Subscription } from 'rxjs';
import { IHabitaciones } from 'src/app/_models/habitaciones.model';


@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
})
export class Step2Component implements OnInit, OnDestroy {
  @Input('updateParentModel') updateParentModel: (
    part: Partial<ICalendario>,
    isFormValid: boolean
  ) => void;
  form: FormGroup;
  updateAccount:ICalendario

  habitaciones:IHabitaciones[]=[]
  amenidades:string[]=[]

  private unsubscribe: Subscription[] = [];

  constructor(
    private _disponibilidadService : DisponibilidadService,
    private fb: FormBuilder,

    ) {}

  ngOnInit() {
    this.initForm();
    this.updateParentModel({}, this.checkForm())
    this._disponibilidadService.currentData.subscribe(res => {
      for(let i=0;i<res.length;i++){
        this.habitaciones.push(res[0])
        for(let x=0;x<res[i].Amenidades.length;x++){
          this.amenidades.push(res[i].Amenidades[x])
        }
      }
    })
  }

  initForm() {
    this.form = this.fb.group({
      businessName: ['', [Validators.required]],
    });

    const formChangesSubscr = this.form.valueChanges.subscribe((val) => {
      this.updateParentModel(val, this.checkForm());
    });
    this.unsubscribe.push(formChangesSubscr);
  }

  checkForm() {
    return !(
      this.form.get('businessName')?.hasError('required')
    );
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
