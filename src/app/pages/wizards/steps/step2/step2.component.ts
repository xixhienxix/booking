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
import { PromosBookingService } from 'src/app/_service/promos.service';
import { PromoValidationResult, PromoValidatorService } from 'src/app/_service/promo.validation.service';
import { Promos } from 'src/app/_models/promos.model';
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

isEditingSearch = false;
editLlegadaDate: Date | null = null;   
editSalidaDate:  Date | null = null;
editPromoCode: string = '';
editPromoStatus: 'idle' | 'valid' | 'invalid' = 'idle';
editPromoMessage: string = '';
editAdultos: number = 1;
editNinos: number = 0;


  @Input() intialDate: Date = new Date();
  @Input() endDate: Date = new Date();
  @Input() qtyNin:number=0
  @Input() qty:number=1;

  @Output() onQtyHabsUpdate:EventEmitter<number> = new EventEmitter()

  totalNights: number = 1

  maxHabsReached:boolean=false


  // For dropdown options (example: 1 to 10 people)
  numPplOptions: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

  // Example "Quedan" options (room availability)
  quedanOptions: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

  // Track selected dropdown values by unique key (roomCode + tarifa)
  // For Adultos (qty)
  selectedQty: { [key: string]: number } = {};

  // For 'Quedan' dropdowns (if needed)
  numeroHabs: number = 1;

  validatedPromo: Promos | null = null; // ← add


  constructor(
    private _disponibilidadService: DisponibilidadService,
    private _tarifasServices: TarifasService,
    private fb: FormBuilder,
    private _promoValidatorService: PromoValidatorService,
    private _promoBookingService: PromosBookingService,
  ) {
    this.reservaForm = this.fb.group({
  codigoCuarto: ['', Validators.required],
  numeroCuarto: ['', Validators.required],
  plan: ['', Validators.required],
  tarifaNotSelected: [false, Validators.requiredTrue]
});

   }

   get minDateEdit(): Date { return new Date(); }


get todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

  async ngOnInit() {

    this.tarifas = await firstValueFrom(this._tarifasServices.currentData);
    this.roomCodesComplete = await firstValueFrom(this._disponibilidadService.getAllHabitaciones());

    this.tarifasStandard = this.tarifas.filter(item => item.Tarifa === 'Tarifa Base');
    this.tarifasTemporales = this.tarifas.filter(item => item.Tarifa === 'Tarifa De Temporada');
    this.tarifasEspeciales = this.tarifas.filter(
      item => item.Tarifa !== 'Tarifa Base' && item.Tarifa !== 'Tarifa De Temporada'
    );

    this._disponibilidadService.currentValidatedPromo.subscribe(promo => {
      this.validatedPromo = promo;
    });

    this._disponibilidadService.currentReserva.subscribe(reservas => {
      const hasReserva = reservas.length > 0;
      this.updateParentModel({}, hasReserva);
    });


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

generateNinosArray(codigo: string) {
  const ninosQty = this.roomCodesComplete.filter(room => room.Codigo === codigo)[0].Ninos;

  // Create array [1, 2, ..., ninosQty]
  const arr = Array.from({ length: ninosQty }, (_, i) => i + 1);

  // Add 0 at the start
  arr.unshift(0);

  return arr;
}



  getTarifasForHabitacion(codigo: string) {
    return this.tarifasArray.filter(t => t.Habitacion.includes(codigo));
  }

  getMaxFromAdultos(codigo: string): number {
    const arr = this.generateAdultosArray(codigo);
    return arr.length ? Math.max(...arr) : 0;
  }

  getMaxFromNinos(codigo:string): number {
    const arr = this.generateNinosArray(codigo);
    return arr.length ? Math.max(...arr) : 0;
  }


onQtyChange(codigo: string) {
  const max = this.getMaxFromAdultos(codigo);
  if (this.qty < max) {
  }
}

onQtyHabsChange(codigo:string, numeroHabs:any){
  this.inventario = Number(numeroHabs);
  const max = this.getMaxValue(codigo)
  if(this.inventario < max){
      this.onQtyHabsUpdate.emit(this.inventario);
  }else {
    this.maxHabsReached=true
  }
}

getValidQty(codigo: string, qty: number): number {
  const validOptions = this.generateAdultosArray(codigo);
  return validOptions.includes(qty) ? qty : validOptions[0];
}

getValidNinQty(codigo: string, qty: number): number {
  const validOptions = this.generateNinosArray(codigo);
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




agregaHab(tarifas: any, codigo: string, quedan: number) {
    const basePrice = this.roundUp(this.ratesToCalc(tarifas, false, codigo)) * this.totalNights;

    // Apply promo discount if active
    let finalPrice = basePrice;
    let discountAmount = 0;

    if (this.validatedPromo) {
      const desglose = Array.from({ length: this.totalNights }, (_, i) => ({
        tarifa: tarifas.Tarifa,
        fecha: `night_${i}`,
        tarifaTotal: this.roundUp(this.ratesToCalc(tarifas, false, codigo)),
      }));

      const result = this._promoValidatorService.applyPromo(
        this.validatedPromo,
        desglose,
        basePrice,
        this.totalNights,
      );

      finalPrice = result.pendiente;
      discountAmount = result.discountAmount;
    }

    const obj: miReserva[] = [{
      codigoCuarto: codigo,
      numeroCuarto: '',
      cantidadHabitaciones: Number(quedan),
      nombreTarifa: tarifas.Tarifa,
      precioTarifa: finalPrice,           // ← discounted price
      precioOriginal: basePrice,          // ← original price for display
      descuentoAplicado: discountAmount,  // ← how much was saved
      promoNombre: this.validatedPromo?.nombre ?? '',
      detallesTarifa: this.plan,
      cantidadAdultos: this.qty,
      cantidadNinos: this.qtyNin,
    }];

    this._disponibilidadService.addMiReserva(obj);

    const hasReserva = (this._disponibilidadService.getMiReserva()?.length ?? 0) > 0;
    this.updateParentModel({}, hasReserva);
  }

getMaxValue(codigo: string): number {
  const arr = this.generateInventarioArray(codigo);
  return arr.length ? Math.max(...arr) : 1;
}

// step2.component.ts
calcPromoTotal(tarifas: any, codigo: string): number {
  if (!this.validatedPromo) {
    return this.roundUp(this.ratesToCalc(tarifas, false, codigo)) * this.totalNights;
  }

  const nightlyRate = this.roundUp(this.ratesToCalc(tarifas, false, codigo));
  const desglose = Array.from({ length: this.totalNights }, (_, i) => ({
    tarifa: tarifas.Tarifa,
    fecha: `night_${i}`,
    tarifaTotal: nightlyRate,
  }));

  const result = this._promoValidatorService.applyPromo(
    this.validatedPromo,
    desglose,
    nightlyRate * this.totalNights,
    this.totalNights,
  );

  return result.pendiente;
}

startEditSearch(): void {
  this.editLlegadaDate = new Date(this.intialDate);
  this.editSalidaDate  = new Date(this.endDate);
  this.editPromoCode   = this.validatedPromo?.codigo ?? '';
  this.editPromoStatus = this.validatedPromo ? 'valid' : 'idle';
  this.editPromoMessage = '';
  this.editAdultos     = this.qty;
  this.editNinos       = this.qtyNin;
  this.isEditingSearch = true;
}

cancelEditSearch(): void {
  this.isEditingSearch = false;
}

/** Called when the user types in the promo field during edit mode */
onEditPromoInput(): void {
  this.editPromoStatus = 'idle';
}

/** Fired when the start date changes in the range picker */
onEditStartDate(event: any): void {
  this.editLlegadaDate = event.value ? new Date(event.value) : null;
}

/** Fired when the end date changes in the range picker */
onEditEndDate(event: any): void {
  this.editSalidaDate = event.value ? new Date(event.value) : null;
}

/** Apply button: validate dates + promo, then trigger availability reload */
applySearchChanges(): void {
  const newStart = this.editLlegadaDate;
  const newEnd   = this.editSalidaDate;

  if (!newStart || !newEnd || newEnd <= newStart) {
    return;
  }

  // 1. Update dates
  this.intialDate  = newStart;
  this.endDate     = newEnd;
  const oneDay     = 1000 * 60 * 60 * 24;
  this.totalNights = Math.round((newEnd.getTime() - newStart.getTime()) / oneDay);

  // 1b. Update guests
  this.qty    = this.editAdultos;
  this.qtyNin = this.editNinos;

  // Propagate to the availability service so the room list reloads
  this._disponibilidadService.changeFechaIni(newStart);
  this._disponibilidadService.changeFechaFinal(newEnd);

  // 2. Validate promo
  const code = this.editPromoCode.trim().toUpperCase();
  if (code) {
    const result = this._promoValidatorService.validatePromo(
      code,
      this._promoBookingService.currentPromos,
      newStart,
      newEnd,
      this.totalNights,
      [],
      [],
      true,
    );

    if (result.valid && result.promo) {
      this.editPromoStatus = 'valid';
      this.validatedPromo  = result.promo;
      this._disponibilidadService.changeValidatedPromo(result.promo);
    } else {
      this.editPromoStatus  = 'invalid';
      this.editPromoMessage = result.reason ?? 'Código no válido.';
      this.validatedPromo   = null;
      this._disponibilidadService.changeValidatedPromo(null);
      return;
    }
  } else {
    this.validatedPromo = null;
    this._disponibilidadService.changeValidatedPromo(null);
  }

  // 3. Notify parent stepper
  this.updateParentModel({}, true);

  // 4. Close edit panel
  this.isEditingSearch = false;
}

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
