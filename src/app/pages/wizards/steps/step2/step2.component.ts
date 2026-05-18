import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
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
import { BookingRoomImageService, IHabitacionImage } from 'src/app/_service/room-image.service';
import { resolvePolicyType } from './cancel-policy/cancelation-policy.helper';
import { CancellationPolicyType } from './cancel-policy/cancelation.policy.component';

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

  // BUG 2 FIX: per-room+tarifa map for selected habs quantity
  // key: `${codigoCuarto}__${tarifaNombre}`
  private roomHabsMap: { [key: string]: number } = {};

  validatedPromo: Promos | null = null;

  // ── Política de cancelación ──────────────────────────────────────────
  // Expone el helper al template para resolver el tipo de política
  // a partir del array tarifas.Politicas
  resolvePolicyType = resolvePolicyType;

  constructor(
    private _disponibilidadService: DisponibilidadService,
    private _tarifasServices: TarifasService,
    private fb: FormBuilder,
    private _promoValidatorService: PromoValidatorService,
    private _promoBookingService: PromosBookingService,
    public roomImageService: BookingRoomImageService,
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

  // BUG 2 FIX: get selected habs for a specific room+tarifa combo
  getRoomHabs(codigo: string, tarifa: string): number {
    const key = `${codigo}__${tarifa}`;
    if (this.roomHabsMap[key] === undefined) {
      // default to 1 if inventory exists, 0 otherwise
      this.roomHabsMap[key] = this.getMaxValue(codigo) > 0 ? 1 : 0;
    }
    return this.roomHabsMap[key];
  }

  // BUG 2 FIX: set selected habs for a specific room+tarifa combo
  setRoomHabs(codigo: string, tarifa: string, value: number): void {
    const key = `${codigo}__${tarifa}`;
    this.roomHabsMap[key] = Number(value);
    this.onQtyHabsUpdate.emit(Number(value));
  }

  async ngOnInit() {
    console.log('%c[Step2] ngOnInit — intialDate:', 'color: yellow', this.intialDate, '| endDate:', this.endDate, '| hasSearched:', this.hasSearched);

    this.tarifas = await firstValueFrom(this._tarifasServices.getAll());
    this.roomCodesComplete = await firstValueFrom(this._disponibilidadService.getAllHabitaciones());

    this.tarifasStandard = this.tarifas.filter(item => item.Tarifa === 'Tarifa Base');
    this.tarifasTemporales = this.tarifas.filter(item => item.Tarifa === 'Tarifa De Temporada');
    this.tarifasEspeciales = this.tarifas.filter(
      item => item.Tarifa !== 'Tarifa Base' && item.Tarifa !== 'Tarifa De Temporada'
    );

    this._disponibilidadService.currentValidatedPromo.subscribe(promo => {
      this.validatedPromo = promo;
    });

    // BUG 1 FIX: validity is ONLY true when at least one room has been added
    this._disponibilidadService.currentReserva.subscribe(reservas => {
      const hasReserva = reservas.length > 0;
      this.updateParentModel({}, hasReserva);
    });

    this.totalNights = this.calcNights(this.intialDate, this.endDate);

    this._disponibilidadService.currentData.subscribe(res => {
      this.habitaciones = [...res];
      // Reset per-room habs map when availability changes
      this.roomHabsMap = {};
    });

    this._tarifasServices.currentData.subscribe(res => {
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

  // BUG 2 + BUG 4 FIX: agregaHab now uses per-room habs qty and tags dates
  agregaHab(tarifas: any, codigo: string, quedan: number) {
    const habsToAdd = Number(quedan);
    const nightlyRate = this.roundUp(this.ratesToCalc(tarifas, false, codigo));
    const basePrice = nightlyRate * this.totalNights * habsToAdd;  // BUG 2: multiply by habsToAdd
    let finalPrice = basePrice;
    let discountAmount = 0;

    if (this.validatedPromo) {
      const desglose = Array.from({ length: this.totalNights }, (_, i) => ({
        tarifa: tarifas.Tarifa,
        fecha: `night_${i}`,
        tarifaTotal: nightlyRate,
      }));
      const result = this._promoValidatorService.applyPromo(
        this.validatedPromo, desglose, nightlyRate * this.totalNights, this.totalNights,
      );
      // BUG 2: multiply promo price by habs quantity too
      finalPrice = result.pendiente * habsToAdd;
      discountAmount = result.discountAmount * habsToAdd;
    }

    // BUG 4 FIX: store the search dates with each reservation entry
    const obj: miReserva[] = [{
      codigoCuarto: codigo,
      numeroCuarto: '',
      cantidadHabitaciones: habsToAdd,
      nombreTarifa: tarifas.Tarifa,
      precioTarifa: finalPrice,
      precioOriginal: basePrice,
      descuentoAplicado: discountAmount,
      promoNombre: this.validatedPromo?.nombre ?? '',
      detallesTarifa: this.plan,
      cantidadAdultos: this.qty,
      cantidadNinos: this.qtyNin,
      // BUG 4: tag with search dates so changing dates later doesn't invalidate them
      fechaInicial: new Date(this.intialDate),
      fechaFinal: new Date(this.endDate),
    }];

    this._disponibilidadService.addMiReserva(obj);
    const hasReserva = (this._disponibilidadService.getMiReserva()?.length ?? 0) > 0;
    this.updateParentModel({}, hasReserva);

    // Reset the habs selector for this room back to 1 after adding
    this.setRoomHabs(codigo, tarifas.Tarifa, 1);
  }

  getMaxValue(codigo: string): number {
    const arr = this.generateInventarioArray(codigo);
    return arr.length ? Math.max(...arr) : 0;
  }

  /**
   * Returns only the habitaciones that have at least one tarifa in tarifasArray.
   * Habitaciones without any matching tarifa are hidden from the UI.
   * Uses deduplication by Codigo so each room type appears only once.
   */
  getHabitacionesConTarifa(): IHabitaciones[] {
    const seenCodigos = new Set<string>();
    return this.habitaciones.filter(hab => {
      if (seenCodigos.has(hab.Codigo)) return false;
      const tieneTarifa = this.tarifasArray.some(t => t.Habitacion.includes(hab.Codigo));
      if (tieneTarifa) seenCodigos.add(hab.Codigo);
      return tieneTarifa;
    });
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
    return result.pendiente; // caller multiplies by getRoomHabs in template
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
  }

  cancelEditSearch(): void {
    this.isEditingSearch = false;
  }

  onEditPromoInput(): void {
    this.editPromoStatus = 'idle';
  }

  onEditStartDate(event: any): void {
    this.editLlegadaDate = event.value ? new Date(event.value) : null;
  }

  onEditEndDate(event: any): void {
    this.editSalidaDate = event.value ? new Date(event.value) : null;
  }

  applySearchChanges(): void {
    const newStart = this.editLlegadaDate;
    const newEnd   = this.editSalidaDate;

    if (!newStart || !newEnd || newEnd <= newStart) return;

    this.intialDate  = newStart;
    this.endDate     = newEnd;
    this.totalNights = this.calcNights(newStart, newEnd);
    this.qty    = this.editAdultos;
    this.qtyNin = this.editNinos;

    this._disponibilidadService.changeFechaIni(newStart);
    this._disponibilidadService.changeFechaFinal(newEnd);

    // BUG 1 FIX: clear validity — user must add a room for the NEW search
    // (existing rooms from other date ranges are kept, but new search = not valid yet)
    const existingReservas = this._disponibilidadService.getMiReserva();
    this.updateParentModel({}, existingReservas.length > 0);

    // Validate promo
    const code = this.editPromoCode.trim().toUpperCase();
    if (code) {
      const result = this._promoValidatorService.validatePromo(
        code,
        this._promoBookingService.currentPromos,
        newStart,
        newEnd,
        this.totalNights,
        [], [], true,
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

    // Reset per-room habs map for the new search
    this.roomHabsMap = {};

    const payload = { intialDate: newStart, endDate: newEnd, qty: this.qty, qtyNin: this.qtyNin };
    this.searchChanged.emit(payload);
    this.isEditingSearch = false;
  }

  // ── Image CDN & carousel ──────────────────────────────────

  /** Base URL of your image CDN / S3 bucket. Update to match your environment. */
  /** Per-room carousel active-index map. Key = room Codigo */
  private carouselIndexMap: { [codigo: string]: number } = {};

  /**
   * Delegates to BookingRoomImageService.getUrl() — uses environment.cdnUrl.
   * Accepts a raw key string for legacy callers; prefer getImageUrl() when
   * you already have the full IHabitacionImage object.
   */
  getCdnUrl(key: string, size: 'thumb' | 'medium' | 'large' = 'medium'): string {
    if (!key) return '';
    if (key.startsWith('http')) return key;
    // Build a minimal image object so getUrl() can resolve the right variant
    const fakeImg: IHabitacionImage = {
      key, thumbKey: key, mediumKey: key, largeKey: key, isCover: false,
    };
    return this.roomImageService.getUrl(fakeImg, size);
  }

  /** Resolves the full CDN URL for a typed image object at the given size. */
  getImageUrl(image: IHabitacionImage, size: 'thumb' | 'medium' | 'large'): string {
    return this.roomImageService.getUrl(image, size);
  }

  getActiveIndex(codigo: string): number {
    return this.carouselIndexMap[codigo] ?? 0;
  }

  setActiveIndex(codigo: string, index: number): void {
    this.carouselIndexMap[codigo] = index;
  }

  nextImage(codigo: string, total: number, event: Event): void {
    event.stopPropagation();
    const current = this.carouselIndexMap[codigo] ?? 0;
    this.carouselIndexMap[codigo] = (current + 1) % total;
  }

  prevImage(codigo: string, total: number, event: Event): void {
    event.stopPropagation();
    const current = this.carouselIndexMap[codigo] ?? 0;
    this.carouselIndexMap[codigo] = (current - 1 + total) % total;
  }

  // ── Lightbox ─────────────────────────────────────────────────

  lightbox: {
    open: boolean;
    images: IHabitacionImage[];
    index: number;
    codigo: string;
  } = { open: false, images: [], index: 0, codigo: '' };

  openLightbox(dispo: IHabitaciones, index: number): void {
    this.lightbox = {
      open:   true,
      images: dispo.images ?? [],
      index,
      codigo: dispo.Codigo,
    };
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightbox.open = false;
    document.body.style.overflow = '';
  }

  lightboxNext(): void {
    this.lightbox.index = (this.lightbox.index + 1) % this.lightbox.images.length;
  }

  lightboxPrev(): void {
    const len = this.lightbox.images.length;
    this.lightbox.index = (this.lightbox.index - 1 + len) % len;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.lightbox.open) return;
    if (event.key === 'Escape')      this.closeLightbox();
    if (event.key === 'ArrowRight')  this.lightboxNext();
    if (event.key === 'ArrowLeft')   this.lightboxPrev();
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
  // ── Promo type helpers for the 5 UX scenarios ──────────────

  // Auto-promos are those applied automatically by date match (not manual coupon codes).
  // We detect them by checking if the promo nombre contains known auto-promo keywords.
  isAutoPromo(promo: Promos | null): boolean {
    if (!promo) return false;
    const name = (promo.nombre ?? '').toLowerCase();
    return (
      name.includes('anticipad') ||
      name.includes('último minuto') ||
      name.includes('ultimo minuto') ||
      name.includes('noche') && name.includes('gratis') ||
      name.includes('básic') ||
      name.includes('basic') ||
      name.includes('especial')
    );
  }

  // Returns the orange banner text for auto-promos
  getPromoBannerText(promo: Promos | null): string {
    if (!promo) return '';
    const name = (promo.nombre ?? '').toLowerCase();
    if (name.includes('anticipad')) return 'OFERTA RESERVA ANTICIPADA';
    if (name.includes('último minuto') || name.includes('ultimo minuto')) return 'OFERTA DE ÚLTIMO MINUTO';
    if (name.includes('noche') && name.includes('gratis')) return '¡PROMOCIÓN NOCHES GRATIS!';
    return 'TARIFA ESPECIAL APLICADA';
  }

  // Returns the bottom legend text for auto-promos
  getPromoLegend(promo: Promos | null): string {
    if (!promo) return '';
    const name = (promo.nombre ?? '').toLowerCase();
    if (name.includes('anticipad')) return '🗓️ ¡Bien hecho! Premiamos tu anticipación con esta súper tarifa.';
    if (name.includes('último minuto') || name.includes('ultimo minuto')) return '⚡ ¡Qué suerte! Atrapaste nuestra tarifa relámpago.';
    if (name.includes('noche') && name.includes('gratis')) return '🎁 ¡A disfrutar! Tu tarifa final ya incluye noche(s) de regalo.';
    return '🌟 Aprovechaste nuestra tarifa preferencial para tus fechas.';
  }
 
}