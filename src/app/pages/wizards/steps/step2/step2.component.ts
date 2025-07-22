import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { ICalendario } from 'src/app/_models/calendario.model';
import { firstValueFrom, Subscription } from 'rxjs';
import { IHabitaciones } from 'src/app/_models/habitaciones.model';
import { TarifasService } from 'src/app/_service/tarifas.service';
import { ITarifas } from 'src/app/_models/tarifas.model';
import { tarifarioTabla, Tarifas } from 'src/app/_models/tarifario.model';
import { MatRadioButton, MatRadioChange } from '@angular/material/radio';
import { miReserva } from 'src/app/_models/mireserva.model';
import { isNumber } from '@ng-bootstrap/ng-bootstrap/util/util';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { HabitacionesService } from 'src/app/_service/habitacion.service';
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

  @Input() accountsCurrentData: ICalendario

  reservaForm: FormGroup;
  updateAccount: ICalendario

  habitaciones: IHabitaciones[] = []
  amenidades: string[] = []
  tarifasArray: Tarifas[] = []
  private unsubscribe: Subscription[] = [];
  numeroDeAdultos: number = 1
  numeroDeNinos: number = 0
  inventario: number = 1;
  nombreTarifa: string = ''
  precioTarifa: number;
  codigoCuarto: string = '';
  numeroCuarto: string;
  plan: string = '';
  tarifaNotSelected: boolean = false;
  currentData: ICalendario
  tarifas:Tarifas[]=[]
  tarifasStandard:Tarifas[]=[]
  tarifasTemporales:Tarifas[]=[]
  tarifasEspeciales:Tarifas[]=[]
  roomCodesComplete:IHabitaciones[]=[]

habitacionesArray: number[] = [];
selectedHabitaciones: number = 1;

  @Input() intialDate: Date = new Date();
  @Input() endDate: Date = new Date();
  @Input() qtyNin:number=0
  @Input() qty:number=1;

  totalNights: number = 1





    // For dropdown options (example: 1 to 10 people)
numPplOptions: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

// Example "Quedan" options (room availability)
quedanOptions: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

// Track selected dropdown values by unique key (roomCode + tarifa)
selectedNumPpl: { [key: string]: number } = {};
selectedQuedan: { [key: string]: number } = {};

  constructor(
    private _disponibilidadService: DisponibilidadService,
    private _tarifasServices: TarifasService,
    private fb: FormBuilder,

  ) { }

  async ngOnInit() {

    this.habitaciones.forEach(dispo => {
    this.tarifasArray.forEach(tarifa => {
      const key = dispo.Codigo + tarifa.Tarifa;
      this.selectedNumPpl[key] = 1;
      this.selectedQuedan[key] = 1;
      });
    });

    this.tarifas = await firstValueFrom(this._tarifasServices.currentData);
    this.roomCodesComplete = await firstValueFrom(this._disponibilidadService.getAllHabitaciones());

    this.tarifasStandard = this.tarifas.filter(item => item.Tarifa === 'Tarifa Base');
    this.tarifasTemporales = this.tarifas.filter(item => item.Tarifa === 'Tarifa De Temporada');
    this.tarifasEspeciales = this.tarifas.filter(
      item => item.Tarifa !== 'Tarifa Base' && item.Tarifa !== 'Tarifa De Temporada'
    );


    // One day in milliseconds
    const oneDay = 1000 * 60 * 60 * 24;

    // Difference in milliseconds
    const diffMs = this.endDate.getTime() - this.intialDate.getTime();

    // Difference in full days (nights)
    this.totalNights = Math.round(diffMs / oneDay);

    if (this.updateAccount) {
      console.log('Search data received from Step 1:', this.updateAccount);
      this.numeroDeAdultos = this.updateAccount.adultos;
      this.numeroDeNinos = this.updateAccount.ninos;
    }

    this._disponibilidadService.currentData.subscribe(res => {
      console.log('habitaciones: ' , ...res)
      this.habitaciones = [...res];
    });

    this._tarifasServices.currentData.subscribe(res => {
      this.tarifasArray = [...res];
    });
  }

generateInventarioArray(codigo: string): number[] {
  const inventario = this.roomCodesComplete.filter(room => room.Codigo === codigo).length;

  return Array.from({ length: inventario }, (_, i) => i + 1);
}

generateAdultosArray(codigo: string){
  const adultosQty = this.roomCodesComplete.filter(room => room.Codigo === codigo)[0].Adultos;

  return Array.from({ length: adultosQty }, (_, i) => i + 1);
}


  getTarifasForHabitacion(codigo: string) {
    return this.tarifasArray.filter(t => t.Habitacion.includes(codigo));
  }

  getMaxFromAdultos(codigo: string): number {
    const arr = this.generateAdultosArray(codigo);
    return arr.length ? Math.max(...arr) : 0;
  }


onQtyChange(codigo: string) {
  const max = this.getMaxFromAdultos(codigo);
  if (this.qty <= max) {
    // No need to do anything else because ngModel already updated `qty`,
    // and Angular will re-render the label and icon conditionally.
  }
}

getValidQty(codigo: string, qty: number): number {
  const validOptions = this.generateAdultosArray(codigo);
  return validOptions.includes(qty) ? qty : validOptions[0];
}



  onSelectChange(evt: any) {
    if (evt.id === 'numeroDeAdultos') {
      this.numeroDeAdultos = parseInt(evt.value);
    }
    else if (evt.id === 'numeroDeNinos') {
      this.numeroDeNinos = parseInt(evt.value);
    }
    else if (evt.id === 'inventario') {
      this.inventario = parseInt(evt.value);
    }
  }

  seleccionHabRadioButton(evt: any) {
    this.codigoCuarto = evt.value.split(',')[0]
    this.numeroCuarto = evt.value.split(',')[1]
    this.precioTarifa = evt.value.split(',')[2]
    this.plan = evt.value.split(',')[3]
    this.tarifaNotSelected = true
  }

  ratesToCalc(tarifa: Tarifas, onlyBreakDown: boolean = false, codigosCuarto = '1', tarifaPromedio = false):any {

    const adultos = this.qty ?? 1; // default to 2
    const ninos = this.qtyNin ?? 0;     // default to 0

    if (onlyBreakDown) {
      const tarifasValidasArray = this._tarifasServices.ratesTotalCalc(
        tarifa,
        this.tarifasStandard,
        this.tarifasTemporales,
        codigosCuarto,
        adultos,
        ninos,
        this.intialDate,
        this.endDate,
        this.totalNights,
        tarifaPromedio,
        false,
        true
      ) ?? [];

      return tarifasValidasArray
    }
    else {
      const tarifasValidasArray = this._tarifasServices.ratesTotalCalc(
        tarifa,
        this.tarifasStandard,
        this.tarifasTemporales,
        codigosCuarto,
        adultos,
        ninos,
        this.intialDate,
        this.endDate,
        this.totalNights,
        tarifaPromedio,
        false,
        true
      ) ?? [];

      return Array.isArray(tarifasValidasArray) ? tarifasValidasArray[0]?.tarifaTotal ?? 0 : tarifasValidasArray ?? 0;

    }
  }

  roundUp(value: number): number {
    return Math.ceil(value);
  }




agregaHab(tarifas: any, codigo: string, numPpl: number, quedan: number) {
  console.log('Agregar habitación:', tarifas, codigo, numPpl, quedan);
  // your logic here...

  //   agregaHab(tarifaSeleccionada: any, codigoCuarto: any, totalTarifa:number, tarifaPromedio:number) {

  //   const obj: miReserva[] = [{
  //     codigoCuarto: codigoCuarto,
  //     numeroCuarto: this.numeroCuarto,
  //     cantidadHabitaciones: this.inventario,
  //     nombreTarifa: this.nombreTarifa,
  //     precioTarifa: totalTarifa,
  //     detallesTarifa: this.plan,
  //     cantidadAdultos: this.qty,
  //     cantidadNinos: this.qtyNin
  //   }]

  //   this._disponibilidadService.addMiReserva(obj)
  // }
}

getMaxValue(codigo: string): number | null {
  const arr = this.generateInventarioArray(codigo);
  return arr.length ? Math.max(...arr) : null;
}


  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
