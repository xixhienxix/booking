import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { ICalendario } from 'src/app/_models/calendario.model';
import { firstValueFrom, Subscription } from 'rxjs';
import { IHabitaciones } from 'src/app/_models/habitaciones.model';
import { TarifasService } from 'src/app/_service/tarifas.service';
import { Tarifas } from 'src/app/_models/tarifario.model';
import { miReserva } from 'src/app/_models/mireserva.model';
import { HabitacionesService } from 'src/app/_service/habitacion.service';
import { PromosBookingService } from 'src/app/_service/promos.service';
import { PromoValidatorService } from 'src/app/_service/promo.validation.service';
import { Promos } from 'src/app/_models/promos.model';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.scss'],
})
export class Step2Component implements OnInit, OnChanges, OnDestroy {
  @Input('updateParentModel') updateParentModel: (
    part: Partial<ICalendario>,
    isFormValid: boolean
  ) => void;

  @Input() accountsCurrentData: ICalendario;

  reservaForm: FormGroup;
  updateAccount: ICalendario;

  habitaciones: IHabitaciones[] = [];
  amenidades: string[] = [];
  tarifasArray: Tarifas[] = [];
  private unsubscribe: Subscription[] = [];
  numeroDeAdultos: number = 1;
  numeroDeNinos: number = 0;
  inventario: number = 1;
  nombreTarifa: string = '';
  precioTarifa: number;
  codigoCuarto: string = '';
  numeroCuarto: string;
  plan: string = '';
  tarifaNotSelected: boolean = false;
  currentData: ICalendario;
  tarifas: Tarifas[] = [];
  tarifasStandard: Tarifas[] = [];
  tarifasTemporales: Tarifas[] = [];
  tarifasEspeciales: Tarifas[] = [];
  roomCodesComplete: IHabitaciones[] = [];

  habitacionesArray: number[] = [];
  selectedHabitaciones: number = 1;

  isEditingSearch = false;
  editLlegadaDate: Date | null = null;
  editSalidaDate: Date | null = null;
  editPromoCode: string = '';
  editPromoStatus: 'idle' | 'valid' | 'invalid' = 'idle';
  editPromoMessage: string = '';
  editAdultos: number = 1;
  editNinos: number = 0;

  @Input() intialDate: Date = new Date();
  @Input() endDate: Date = new Date();
  @Input() qtyNin: number = 0;
  @Input() qty: number = 1;
  @Input() hasSearched: boolean = false;

  @Output() onQtyHabsUpdate: EventEmitter<number> = new EventEmitter();
  @Output() searchChanged = new EventEmitter<{
    intialDate: Date;
    endDate: Date;
    qty: number;
    qtyNin: number;
  }>();

  totalNights: number = 1;
  maxHabsReached: boolean = false;

  numPplOptions: number[] = Array.from({ length: 10 }, (_, i) => i + 1);
  quedanOptions: number[] = Array.from({ length: 10 }, (_, i) => i + 1);
  selectedQty: { [key: string]: number } = {};
  numeroHabs: number = 1;

  validatedPromo: Promos | null = null;

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
    console.log('%c[Step2] ngOnInit — intialDate:', 'color: yellow', this.intialDate, '| endDate:', this.endDate, '| hasSearched:', this.hasSearched);

    this.tarifas = await firstValueFrom(this._tarifasServices.getAll());
    this.roomCodesComplete = await firstValueFrom(this._disponibilidadService.getAllHabitaciones());

    console.log('[Step2] roomCodesComplete loaded:', this.roomCodesComplete.length, 'rooms');
    console.log('[Step2] tarifas loaded:', this.tarifas.length, 'tarifas');

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

    this.totalNights = this.calcNights(this.intialDate, this.endDate);
    console.log('[Step2] totalNights on init:', this.totalNights);

    this._disponibilidadService.currentData.subscribe(res => {
      console.log('%c[Step2] habitaciones updated from service:', 'color: yellow', res.length, 'rooms', res);
      this.habitaciones = [...res];
    });

    this._tarifasServices.currentData.subscribe(res => {
      console.log('[Step2] tarifasArray updated from service:', res.length, 'tarifas');
      this.tarifasArray = [...res];
    });

    if (!this.hasSearched) {
      this.startEditSearch();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['intialDate'] || changes['endDate']) {
      if (this.intialDate && this.endDate) {
        this.totalNights = this.calcNights(this.intialDate, this.endDate);
        console.log('[Step2] ngOnChanges — totalNights recalculated:', this.totalNights);
      }
    }
    if (changes['hasSearched']) {
      console.log('[Step2] ngOnChanges — hasSearched changed to:', this.hasSearched);
    }
  }

  calcNights(start: Date, end: Date): number {
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / oneDay));
  }

  generateInventarioArray(codigo: string): number[] {
    const disponibles = this._disponibilidadService.currentPreAsignadas
      .filter(room => room.codigo === codigo);

    // Subtract rooms already added to miReserva
    const yaAgregadas = this._disponibilidadService.getMiReserva()
      .filter(r => r.codigoCuarto === codigo)
      .reduce((sum, r) => sum + r.cantidadHabitaciones, 0);

    const inventario = Math.max(0, disponibles.length - yaAgregadas);

    return Array.from({ length: inventario }, (_, i) => i + 1);
  }
  

  generateAdultosArray(codigo: string) {
    const adultosQty = this.roomCodesComplete.filter(room => room.Codigo === codigo)[0].Adultos;
    return Array.from({ length: adultosQty }, (_, i) => i + 1);
  }

  generateNinosArray(codigo: string) {
    const ninosQty = this.roomCodesComplete.filter(room => room.Codigo === codigo)[0].Ninos;
    const arr = Array.from({ length: ninosQty }, (_, i) => i + 1);
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

  getMaxFromNinos(codigo: string): number {
    const arr = this.generateNinosArray(codigo);
    return arr.length ? Math.max(...arr) : 0;
  }

  onQtyChange(codigo: string) {}

  onQtyHabsChange(codigo: string, numeroHabs: any) {
    this.inventario = Number(numeroHabs);
    const max = this.getMaxValue(codigo);
    if (this.inventario < max) {
      this.onQtyHabsUpdate.emit(this.inventario);
    } else {
      this.maxHabsReached = true;
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
    if (evt.id === 'numeroDeAdultos') this.numeroDeAdultos = parseInt(evt.value);
    else if (evt.id === 'numeroDeNinos') this.numeroDeNinos = parseInt(evt.value);
    else if (evt.id === 'inventario') this.inventario = parseInt(evt.value);
  }

  seleccionHabRadioButton(evt: any) {
    this.codigoCuarto = evt.value.split(',')[0];
    this.numeroCuarto = evt.value.split(',')[1];
    this.precioTarifa = evt.value.split(',')[2];
    this.plan = evt.value.split(',')[3];
    this.tarifaNotSelected = true;
  }

  ratesToCalc(tarifa: Tarifas, onlyBreakDown: boolean = false, codigosCuarto = '1', tarifaPromedio = false): any {
    const adultos = this.qty ?? 1;
    const ninos = this.qtyNin ?? 0;

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

    if (onlyBreakDown) return tarifasValidasArray;
    return Array.isArray(tarifasValidasArray) ? tarifasValidasArray[0]?.tarifaTotal ?? 0 : tarifasValidasArray ?? 0;
  }

  roundUp(value: number): number {
    return Math.ceil(value);
  }

  agregaHab(tarifas: any, codigo: string, quedan: number) {
    const basePrice = this.roundUp(this.ratesToCalc(tarifas, false, codigo)) * this.totalNights;
    let finalPrice = basePrice;
    let discountAmount = 0;

    if (this.validatedPromo) {
      const desglose = Array.from({ length: this.totalNights }, (_, i) => ({
        tarifa: tarifas.Tarifa,
        fecha: `night_${i}`,
        tarifaTotal: this.roundUp(this.ratesToCalc(tarifas, false, codigo)),
      }));
      const result = this._promoValidatorService.applyPromo(
        this.validatedPromo, desglose, basePrice, this.totalNights,
      );
      finalPrice = result.pendiente;
      discountAmount = result.discountAmount;
    }

    const obj: miReserva[] = [{
      codigoCuarto: codigo,
      numeroCuarto: '',
      cantidadHabitaciones: Number(quedan),
      nombreTarifa: tarifas.Tarifa,
      precioTarifa: finalPrice,
      precioOriginal: basePrice,
      descuentoAplicado: discountAmount,
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
    return arr.length ? Math.max(...arr) : 0;
  }

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
      this.validatedPromo, desglose, nightlyRate * this.totalNights, this.totalNights,
    );
    return result.pendiente;
  }

  startEditSearch(): void {
    this.editLlegadaDate  = new Date(this.intialDate);
    this.editSalidaDate   = new Date(this.endDate);
    this.editPromoCode    = this.validatedPromo?.codigo ?? '';
    this.editPromoStatus  = this.validatedPromo ? 'valid' : 'idle';
    this.editPromoMessage = '';
    this.editAdultos      = this.qty;
    this.editNinos        = this.qtyNin;
    this.isEditingSearch  = true;
    console.log('[Step2] startEditSearch — pre-filled with:', {
      editLlegadaDate: this.editLlegadaDate,
      editSalidaDate: this.editSalidaDate,
      editAdultos: this.editAdultos,
      editNinos: this.editNinos,
    });
  }

  cancelEditSearch(): void {
    this.isEditingSearch = false;
  }

  onEditPromoInput(): void {
    this.editPromoStatus = 'idle';
  }

  onEditStartDate(event: any): void {
    this.editLlegadaDate = event.value ? new Date(event.value) : null;
    console.log('[Step2] onEditStartDate:', this.editLlegadaDate);
  }

  onEditEndDate(event: any): void {
    this.editSalidaDate = event.value ? new Date(event.value) : null;
    console.log('[Step2] onEditEndDate:', this.editSalidaDate);
  }

  /** Apply button: validate dates + promo, then trigger availability reload */
  applySearchChanges(): void {
    const newStart = this.editLlegadaDate;
    const newEnd   = this.editSalidaDate;

    console.log('%c[Step2] applySearchChanges fired', 'color: magenta; font-weight: bold', { newStart, newEnd });

    if (!newStart || !newEnd || newEnd <= newStart) {
      console.warn('[Step2] applySearchChanges — invalid dates, aborting', { newStart, newEnd });
      return;
    }

    // 1. Update dates
    this.intialDate  = newStart;
    this.endDate     = newEnd;
    this.totalNights = this.calcNights(newStart, newEnd);
    console.log('[Step2] totalNights after apply:', this.totalNights);

    // 1b. Update guests
    this.qty    = this.editAdultos;
    this.qtyNin = this.editNinos;

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
        console.warn('[Step2] promo invalid, aborting emit', result);
        return;
      }
    } else {
      this.validatedPromo = null;
      this._disponibilidadService.changeValidatedPromo(null);
    }

    // 3. Notify parent stepper
    this.updateParentModel({}, true);

    // 4. Emit so horizontal re-runs the availability query
    const payload = { intialDate: newStart, endDate: newEnd, qty: this.qty, qtyNin: this.qtyNin };
    console.log('%c[Step2] emitting searchChanged', 'color: magenta', payload);
    this.searchChanged.emit(payload);

    // 5. Close edit panel
    this.isEditingSearch = false;
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}