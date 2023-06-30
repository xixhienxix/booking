import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { ICalendario } from 'src/app/_models/calendario.model';
import { Subscription } from 'rxjs';
import { IHabitaciones } from 'src/app/_models/habitaciones.model';
import { TarifasService } from 'src/app/_service/tarifas.service';
import { ITarifas } from 'src/app/_models/tarifas.model';
import { tarifarioTabla } from 'src/app/_models/tarifario.model';
@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.scss'],
})
export class Step2Component implements OnInit, OnDestroy {
  @Input('updateParentModel') updateParentModel: (
    part: Partial<ICalendario>,
    isFormValid: boolean
  ) => void;
  reservaForm: FormGroup;
  updateAccount:ICalendario

  habitaciones:IHabitaciones[]=[]
  amenidades:string[]=[]
  tarifasArray:tarifarioTabla[]=[]
  private unsubscribe: Subscription[] = [];

  constructor(
    private _disponibilidadService : DisponibilidadService,
    private _tarifasServices : TarifasService,
    private fb: FormBuilder,

    ) {}

  ngOnInit() {
    // this.updateParentModel({}, this.checkForm())
    this._disponibilidadService.currentData.subscribe(res => {
      this.habitaciones=[]
      for(let i=0;i<res.length;i++){
        this.habitaciones.push(res[i])
      }
    })
    this._tarifasServices.currentData.subscribe(res=>{
      this.tarifasArray=[]
      for(let h =0 ; h<res.length;h++)
      {
        this.tarifasArray.push(res[h])
      }
    })
    console.log(this.habitaciones)
  }


  initForm() {
    // this.reservaForm = this.fb.group({
    //   codigoCuarto: [''],
    //   nombreTarifa: [''],
    //   tarifa:[''],
    //   personas:[''],
    //   inventario:['']

    // });

  }

  // checkForm() {
  //   return !(
  //     this.reservaForm.get('codigoCuarto')?.hasError('required')
  //   );
  // }

  seleccionHab(){

  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
