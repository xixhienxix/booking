import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { firstValueFrom, map, switchMap } from 'rxjs';
import { ICalendario } from 'src/app/_models/calendario.model';
import { PackagesService } from 'src/app/_service/packages.service';
import { Packages } from 'src/app/_models/packages.model';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { Promos } from 'src/app/_models/promos.model';
import { miReserva } from 'src/app/_models/mireserva.model';
import { DateTime } from 'luxon';
import { FolioService } from 'src/app/_service/folios.service';
import { BookingHuesped, BookingReservaService } from 'src/app/_service/booking-reserva.service';
import { TarifasService } from 'src/app/_service/tarifas.service';
import { PromoValidatorService } from 'src/app/_service/promo.validation.service';
import { SpinnerService } from 'src/app/_service/spinner.service';
import { ParametersService } from 'src/app/_service/parameters.service';
import { PARAMETERS } from 'src/app/_models/parameters.model';

export interface PackagesSimplex extends Packages {
  habitacionesMatch: string[];
  selectedCantidad?: number;
}

@Component({
  selector: 'app-step3',
  templateUrl: './step3.component.html',
  styleUrls: ['./step3.component.scss']
})
export class Step3Component implements OnInit {
  cardForm: FormGroup;
  currentParametros: PARAMETERS;

  @Input('updateParentModel') updateParentModel: (part: Partial<ICalendario>, isFormValid: boolean) => void;
  @Output() formValid = new EventEmitter<boolean>();

  packagesList: PackagesSimplex[] = [];
  selectedQuantity = 1;
  guestForm: FormGroup;
  quantity = 1;

  totalPayment: number = 0;
  partialPayment: number = 0;
  validatedPromo: Promos | null = null;
  checkIn: Date;
  checkOut: Date;
  stayNights: number = 1;

  constructor(
    private _packagesServices: PackagesService,
    private _disponibilidadService: DisponibilidadService,
    private _folioService: FolioService,
    private _bookingReservaService: BookingReservaService,
    private _tarifasService: TarifasService,
    private _promoValidatorService: PromoValidatorService,
    private _spinnerService: SpinnerService,
    private _parametrosService: ParametersService,
    private fb: FormBuilder
  ) {
    this.cardForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{13,19}$/)]],
      expiryDate: ['', [Validators.required, this.expiryDateValidator]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    });
  }

  // BUG 3 FIX: expose reservas to template so we can show per-room add buttons
  getMiReserva(): miReserva[] {
    return this._disponibilidadService.getMiReserva();
  }

  async ngOnInit() {
    this.initForm();
    this._parametrosService.getAll().subscribe();
    this.currentParametros = this._parametrosService.currentParameters;

    this._disponibilidadService.currentValidatedPromo.subscribe(p => this.validatedPromo = p);
    this._disponibilidadService.currentFechaIni.subscribe(d => this.checkIn = d);
    this._disponibilidadService.currentFechaFin.subscribe(d => {
      this.checkOut = d;
      if (this.checkIn) {
        const diff = DateTime.fromJSDate(d).diff(DateTime.fromJSDate(this.checkIn), 'days').days;
        this.stayNights = Math.round(diff);
      }
    });

    this._disponibilidadService.currentReserva.subscribe(reservas => {
      this.totalPayment = reservas.reduce((sum, reserva) => {
        const roomTotal = reserva.precioTarifa || 0;
        const pkgTotal = reserva.packageList?.reduce((s, p) => s + (p.Precio * p.Cantidad), 0) ?? 0;
        return sum + roomTotal + pkgTotal;
      }, 0);
      this.partialPayment = this.totalPayment * 0.5;
    });

    this.guestForm.get('email')?.valueChanges.subscribe(email => {
      if (email) localStorage.setItem('guestEmail', email);
    });

    this.totalPayment = this._disponibilidadService.getMiReserva().reduce((sum, obj) => sum + obj.precioTarifa, 0);
    this.partialPayment = this.totalPayment * 0.5;

    const updateStep3Validity = () => {
      const isValid = this.guestForm.valid && this.cardForm.valid;
      this.formValid.emit(isValid);
    };

    this.guestForm.valueChanges.subscribe(updateStep3Validity);
    this.guestForm.statusChanges.subscribe(updateStep3Validity);
    this.cardForm.valueChanges.subscribe(updateStep3Validity);
    this.cardForm.statusChanges.subscribe(updateStep3Validity);
    updateStep3Validity();

    // BUG 3 FIX: load packages and filter per matched rooms — unchanged logic
    this._disponibilidadService.currentReserva.pipe(
      switchMap(rsv => {
        const codigosCuarto = rsv.map(t => t.codigoCuarto);
        return this._packagesServices.getAllPackages().pipe(
          map(packages => packages
            .map(pkg => ({
              ...pkg,
              habitacionesMatch: pkg.Habitacion.filter(h => codigosCuarto.includes(h))
            }))
            .filter(pkg => pkg.habitacionesMatch.length > 0)
          )
        );
      })
    ).subscribe(filteredPackages => {
      this.packagesList = filteredPackages
        .filter(item => item.Categoria.includes('Paquetes'))
        .map(item => ({ ...item, selectedCantidad: 1 }));
    });
  }

  // BUG 3 FIX: new method — add extra to ONE specific reserva, not all matching rooms
  agregarExtraAHabitacion(packages: PackagesSimplex, reserva: miReserva) {
    const currentReserva = this._disponibilidadService.getMiReserva().map(r => ({
      ...r,
      packageList: r.packageList ? [...r.packageList] : []
    }));

    const { habitacionesMatch, selectedCantidad, ...packageToAdd } = packages;
    packageToAdd.Cantidad = selectedCantidad ?? 1;

    // Find the exact reserva by matching codigoCuarto AND dates (Bug 4 compatibility)
    const target = currentReserva.find(r =>
      r.codigoCuarto === reserva.codigoCuarto &&
      r.fechaInicial?.toISOString() === reserva.fechaInicial?.toISOString()
    );

    if (!target) {
      console.warn('[Step3] agregarExtraAHabitacion — target room not found:', reserva);
      return;
    }

    // Validate room is in habitacionesMatch
    if (!habitacionesMatch.includes(target.codigoCuarto)) {
      console.warn('[Step3] extra not valid for room:', target.codigoCuarto);
      return;
    }

    target.packageList.push({ ...packageToAdd });

    this._disponibilidadService.changeMiReserva(currentReserva);

    // Recalc totals
    this.totalPayment = currentReserva.reduce((sum, r) => {
      const roomTotal = r.precioTarifa || 0;
      const pkgTotal = r.packageList?.reduce((s, p) => s + (p.Precio * p.Cantidad), 0) ?? 0;
      return sum + roomTotal + pkgTotal;
    }, 0);
    this.partialPayment = this.totalPayment * 0.5;
  }

  // Keep original agregarExtra for backward compat (now unused in template)
  agregarExtra(packages: PackagesSimplex) {
    const currentReserva = this._disponibilidadService.getMiReserva().map(r => ({
      ...r,
      packageList: r.packageList ? [...r.packageList] : []
    }));

    const { habitacionesMatch, selectedCantidad, ...packageToAdd } = packages;
    packageToAdd.Cantidad = selectedCantidad ?? 1;

    let added = false;
    currentReserva.forEach(item => {
      if (habitacionesMatch.includes(item.codigoCuarto)) {
        item.packageList.push({ ...packageToAdd });
        added = true;
      }
    });

    if (!added) return;

    this._disponibilidadService.changeMiReserva(currentReserva);
    this.totalPayment = currentReserva.reduce((sum, reserva) => {
      const roomTotal = reserva.precioTarifa || 0;
      const pkgTotal = reserva.packageList?.reduce((s, p) => s + (p.Precio * p.Cantidad), 0) ?? 0;
      return sum + roomTotal + pkgTotal;
    }, 0);
    this.partialPayment = this.totalPayment * 0.5;
  }

  plus(pkg: any) { pkg.selectedCantidad++; }
  minus(pkg: any) { if (pkg.selectedCantidad > 1) pkg.selectedCantidad--; }

  initForm(): void {
    this.guestForm = this.fb.group({
      nombre:        ['', [Validators.required, Validators.minLength(3)]],
      telefono:      ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email:         ['', [Validators.required, Validators.email]],
      confirmaEmail: ['', [Validators.required, Validators.email]],
      pais:          ['', Validators.required],
      requerimiento: [''],
      paymentType:   ['', Validators.required],
      hotelDirect:   [false, Validators.requiredTrue],
    }, {
      validators: this.emailMatchValidator('email', 'confirmaEmail'),
    });
  }

  luhnCheck(num: string): boolean {
    let sum = 0;
    let shouldDouble = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i], 10);
      if (shouldDouble) { digit *= 2; if (digit > 9) digit -= 9; }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  emitValidity(): void {
    const isValid = this.guestForm.valid && this.cardForm.valid;
    this.formValid.emit(isValid);
  }

  formatExpiryDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) value = value.substring(0, 2) + '/' + value.substring(2, 4);
    input.value = value;
    this.cardForm.get('expiryDate')?.setValue(value, { emitEvent: true });
  }

  emailMatchValidator(emailKey: string, confirmEmailKey: string): ValidatorFn {
    return (group: AbstractControl) => {
      const email = group.get(emailKey)?.value;
      const confirmEmail = group.get(confirmEmailKey)?.value;
      return email === confirmEmail ? null : { emailsMismatch: true };
    };
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').substring(0, 16);
    const formatted = digits.match(/.{1,4}/g)?.join('-') ?? digits;
    input.value = formatted;
    this.cardForm.get('cardNumber')?.setValue(digits, { emitEvent: false });
    this.cardForm.get('cardNumber')?.updateValueAndValidity();
  }

  detectCardType(number: string): string {
    const clean = number.replace(/\D/g, '');
    if (/^4/.test(clean)) return 'visa';
    if (/^5[1-5]/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    if (/^6(?:011|5)/.test(clean)) return 'discover';
    return 'unknown';
  }

  get cardType(): string {
    return this.detectCardType(this.cardForm.get('cardNumber')?.value ?? '');
  }

  get f() { return this.guestForm.controls; }

  expiryDateValidator(control: AbstractControl) {
    if (!control.value) return null;
    const regex = /^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/;
    if (!regex.test(control.value)) return { invalidExpiryDate: true };
    const [month, year] = control.value.split('/');
    let expYear = parseInt(year, 10);
    if (year.length === 2) expYear += 2000;
    const expiry = new Date(expYear, parseInt(month, 10) - 1, 1);
    expiry.setMonth(expiry.getMonth() + 1);
    return expiry < new Date() ? { expired: true } : null;
  }

  async submitBooking(): Promise<boolean> {
    try {
      this._spinnerService.loadingState = true;
      const formData = this.guestForm.value;
      const miReserva = this._disponibilidadService.getMiReserva();
      if (!miReserva.length) return false;

      const folio = await firstValueFrom(this._folioService.getBookingFolio());
      let currentFolioValue = parseInt(folio.Folio, 10);
      localStorage.setItem('guestEmail', formData.email);

      const allTarifas = await firstValueFrom(this._tarifasService.currentData);
      const standardRatesArray = allTarifas.filter(t => t.Tarifa === 'Tarifa Base');
      const tempRatesArray = allTarifas.filter(t => t.Tarifa === 'Tarifa De Temporada');

      const huespedArray: BookingHuesped[] = [];

      for (const reserva of miReserva) {
        const folioStr = folio.Letra + currentFolioValue;



        // CRITICAL: always use dates stored on the reserva, never global checkIn/checkOut
        // fechaInicial/fechaFinal were set in agregaHab when the user added the room.
        if (!reserva.fechaInicial || !reserva.fechaFinal) {
          console.error('[Step3] submitBooking — reserva missing dates', reserva);
          this._spinnerService.loadingState = false;
          return false;
        }
        const reservaCheckIn  = new Date(reserva.fechaInicial);
        const reservaCheckOut = new Date(reserva.fechaFinal);
        const reservaNights = Math.max(1, Math.round(
          (reservaCheckOut.getTime() - reservaCheckIn.getTime()) / (1000 * 60 * 60 * 24)
        ));

        const llegada = DateTime.fromJSDate(reservaCheckIn)
          .set({ hour: 15, minute: 0, second: 0 }).toISO()!;
        const salida = DateTime.fromJSDate(reservaCheckOut)
          .set({ hour: 12, minute: 0, second: 0 }).toISO()!;

        const fullTarifa = allTarifas.find(t =>
          t.Tarifa === reserva.nombreTarifa && t.Habitacion.includes(reserva.codigoCuarto)
        );

        if (!fullTarifa) {
          console.error(`Tarifa not found for ${reserva.codigoCuarto} - ${reserva.nombreTarifa}`);
          this._spinnerService.loadingState = false;
          return false;
        }

        const desgloseEdoCuenta = this._tarifasService.ratesTotalCalc(
          fullTarifa, standardRatesArray, tempRatesArray,
          reserva.codigoCuarto, reserva.cantidadAdultos, reserva.cantidadNinos,
          new Date(llegada), new Date(salida), reservaNights,
          false, false, true
        ) ?? [];

        let finalDesglose = desgloseEdoCuenta as { tarifa: string; fecha: string; tarifaTotal: number }[];
        let finalPendiente = reserva.precioTarifa;

        if (this.validatedPromo) {
          const result = this._promoValidatorService.applyPromo(
            this.validatedPromo, finalDesglose, finalPendiente, reservaNights,
          );
          finalDesglose = result.desgloseEdoCuenta;
          finalPendiente = result.pendiente;
        }

        const roomsArray = this._disponibilidadService.currentPreAsignadas;
        const room = roomsArray.find(r => r.codigo === reserva.codigoCuarto);
        const numero = room?.numero ?? '';

        const huesped: BookingHuesped = {
          folio: folioStr,
          adultos: reserva.cantidadAdultos,
          ninos: reserva.cantidadNinos,
          nombre: formData.nombre,
          estatus: 'Reserva Sin Pago',
          llegada,
          salida,
          noches: reservaNights,
          tarifa: fullTarifa,
          porPagar: finalPendiente,
          pendiente: finalPendiente,
          origen: 'Página Web',
          habitacion: reserva.codigoCuarto,
          telefono: formData.telefono,
          email: formData.email,
          creada: new Date().toISOString(),
          motivo: '',
          fechaNacimiento: '',
          trabajaEn: '',
          tipoDeID: '',
          numeroDeID: '',
          direccion: '',
          pais: formData.pais,
          ciudad: '',
          codigoPostal: '',
          lenguaje: '',
          numeroCuarto: this.currentParametros.room_auto_assign ? numero : '',
          tipoHuesped: '',
          notas: formData.requerimiento ?? '',
          vip: '',
          ID_Socio: 0,
          estatus_Ama_De_Llaves: 'LIMPIA',
          desgloseEdoCuenta: finalDesglose,
          lateCheckOut: '',
          promoCode: this.validatedPromo?.codigo ?? '',
        };

        huespedArray.push(huesped);
        currentFolioValue++;
      }

      const result = await this._bookingReservaService.processBooking(huespedArray, 'America/Mexico_City');
      this._spinnerService.loadingState = false;
      return result.success;

    } catch (err) {
      this._spinnerService.loadingState = false;
      console.error('submitBooking error:', err);
      return false;
    }
  }
}