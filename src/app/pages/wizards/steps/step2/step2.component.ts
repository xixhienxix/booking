import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { ICalendario } from 'src/app/_models/calendario.model';
import { Subscription } from 'rxjs';
import { IHabitaciones } from 'src/app/_models/habitaciones.model';
import { TarifasService } from 'src/app/_service/tarifas.service';
import { ITarifas } from 'src/app/_models/tarifas.model';
import { tarifarioTabla } from 'src/app/_models/tarifario.model';
import { MatRadioButton, MatRadioChange } from '@angular/material/radio';
import { miReserva } from 'src/app/_models/mireserva.model';
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
  numeroDeAdultos:number=1
  numeroDeNinos:number=0
  inventario:number=1;
  nombreTarifa:string=''
  precioTarifa:number;
  codigoCuarto:string='';
  numeroCuarto:number;
  plan:string='';
  tarifaNotSelected:boolean=false;

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

  onSelectChange(evt:any){
    if(evt.id === 'numeroDeAdultos'){
      this.numeroDeAdultos = parseInt(evt.value);
    }
    else if(evt.id === 'numeroDeNinos'){
      this.numeroDeNinos = parseInt(evt.value);
    }
    else if (evt.id === 'inventario'){
      this.inventario = parseInt(evt.value);
    }
  }

  seleccionHabRadioButton(evt:MatRadioChange){
    this.codigoCuarto = evt.value.split(',')[0]
    this.numeroCuarto = evt.value.split(',')[1]
    this.precioTarifa = evt.value.split(',')[2]
    this.plan = evt.value.split(',')[3]
    this.tarifaNotSelected=true
  }

  agregaHab(){
    const obj : miReserva[]= [{
      codigoCuarto:this.codigoCuarto,
      numeroCuarto:this.numeroCuarto,
      cantidadHabitaciones:this.inventario,
      nombreTarifa:this.nombreTarifa,
      precioTarifa:this.precioTarifa,
      detallesTarifa:this.plan,
      cantidadAdultos:this.numeroDeAdultos,
      cantidadNinos:this.numeroDeNinos
    }]

    this._disponibilidadService.addMiReserva(obj)
  }
  

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
