import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { combineLatest, firstValueFrom, map, startWith, Subscription, switchMap, tap } from 'rxjs';
import { ICalendario } from 'src/app/_models/calendario.model';
import { PackagesService } from 'src/app/_service/packages.service';
import { Packages } from 'src/app/_models/packages.model';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { Promos } from 'src/app/_models/promos.model';
import { DateTime } from 'luxon';
import { FolioService } from 'src/app/_service/folios.service';
import { BookingHuesped, BookingReservaService } from 'src/app/_service/booking-reserva.service';
import { TarifasService } from 'src/app/_service/tarifas.service';
import { PromoValidatorService } from 'src/app/_service/promo.validation.service';
import { SpinnerService } from 'src/app/_service/spinner.service';
import { ParametersService } from 'src/app/_service/parameters.service';
import { PARAMETERS } from 'src/app/_models/parameters.model';
import { HabitacionesService } from 'src/app/_service/habitacion.service';

export interface PackagesSimplex extends Packages {
  habitacionesMatch: string[]
  selectedCantidad?: number
}
@Component({
  selector: 'app-step3',
  templateUrl: './step3.component.html',
  styleUrls: ['./step3.component.scss']
})
export class Step3Component implements OnInit {
  cardForm: FormGroup;
  currentParametros:PARAMETERS

  constructor(
    private _packagesServices: PackagesService, 
    private _disponibilidadService: DisponibilidadService, 
    private _folioService: FolioService,
    private _bookingReservaService: BookingReservaService,
    private _tarifasService: TarifasService,
    private _promoValidatorService: PromoValidatorService,
    private _spinnerService: SpinnerService,
    private _parametrosService: ParametersService,
    private _habitacionesService: HabitacionesService,
    private fb: FormBuilder) 
  {
    this.cardForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{13,19}$/)]],  // 13-19 digits for card number
      expiryDate: ['', [Validators.required, this.expiryDateValidator]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],  // 3 or 4 digit CVV
    });
  }

  @Input('updateParentModel') updateParentModel: (part: Partial<ICalendario>, isFormValid: boolean) => void;
  @Output() formValid = new EventEmitter<boolean>();


  packagesList: PackagesSimplex[] = [];
  selectedQuantity = 1; // default value
  guestForm: FormGroup
  quantity = 1;

  totalPayment: number = 0;
  partialPayment: number = 0;
  validatedPromo: Promos | null = null;
  checkIn: Date;
  checkOut: Date;
  stayNights: number = 1;


  async ngOnInit() {
    this.initForm();
    this._parametrosService.getAll().subscribe();
    this.currentParametros = this._parametrosService.currentParameters;

    console.log('this._parametrosService.getAll()', this.currentParametros)


    this._disponibilidadService.currentValidatedPromo.subscribe(p => this.validatedPromo = p);
    this._disponibilidadService.currentFechaIni.subscribe(d => this.checkIn = d);
    this._disponibilidadService.currentFechaFin.subscribe(d => {
      this.checkOut = d;
      if (this.checkIn) {
        const diff = DateTime.fromJSDate(d).diff(DateTime.fromJSDate(this.checkIn), 'days').days;
        this.stayNights = Math.round(diff);
      }
    });

    // ── Sync totals from service so they match app-reserva exactly ──
    this._disponibilidadService.currentReserva.subscribe(reservas => {
      this.totalPayment = reservas.reduce((sum, reserva) => {
        const roomTotal = reserva.precioTarifa || 0;
        const pkgTotal = reserva.packageList?.reduce((s, p) => s + (p.Precio * p.Cantidad), 0) ?? 0;
        return sum + roomTotal + pkgTotal;
      }, 0);
      this.partialPayment = this.totalPayment * 0.5;
    });

    // step3.component.ts — add inside ngOnInit after form setup
    this.guestForm.get('email')?.valueChanges.subscribe(email => {
      if (email) localStorage.setItem('guestEmail', email);
    });

    this.totalPayment = this._disponibilidadService.getMiReserva().reduce((sum, obj) => sum + obj.precioTarifa, 0);
    this.partialPayment = this.totalPayment * .5;

    // Assume you already have step3Form defined
    this.guestForm.statusChanges.subscribe(() => {
      this.formValid.emit(this.guestForm.valid);
    });

    const updateStep3Validity = () => {
      const isValid = this.guestForm.valid && this.cardForm.valid;
      this.formValid.emit(isValid);
    };

    // Watch for any form control changes, not just status
    this.guestForm.valueChanges.subscribe(updateStep3Validity);
    this.guestForm.statusChanges.subscribe(updateStep3Validity);
    this.cardForm.valueChanges.subscribe(updateStep3Validity);
    this.cardForm.statusChanges.subscribe(updateStep3Validity);

    // Trigger initial validity calculation
    updateStep3Validity();

    this._disponibilidadService.currentReserva.pipe(
      switchMap(rsv => {
        const codigosCuarto = rsv.map(t => t.codigoCuarto);

        return this._packagesServices.getAllPackages().pipe(
          map(packages => {
            return packages
              .map(pkg => {
                const habitacionesMatch = pkg.Habitacion.filter(h =>
                  codigosCuarto.includes(h)
                );

                return {
                  ...pkg,
                  habitacionesMatch // 👈 new property added
                };
              })
              .filter(pkg => pkg.habitacionesMatch.length > 0); // keep only relevant ones
          })
        );
      })
    ).subscribe(filteredPackages => {
      this.packagesList = filteredPackages
        .filter(item => item.Categoria.includes('Paquetes'))
        .map(item => ({
          ...item,
          selectedCantidad: 1
        }));
    });
  }

  agregarExtra(packages: PackagesSimplex) {
    // Get a deep copy to avoid mutation issues
    const currentReserva = this._disponibilidadService.getMiReserva().map(r => ({
      ...r,
      packageList: r.packageList ? [...r.packageList] : []  // ← ensure array exists
    }));

    const { habitacionesMatch, selectedCantidad, ...packageToAdd } = packages;
    packageToAdd.Cantidad = selectedCantidad ?? 1;

    // Add to matching room(s)
    let added = false;
    currentReserva.forEach(item => {
      if (habitacionesMatch.includes(item.codigoCuarto)) {
        item.packageList.push({ ...packageToAdd }); // ← spread to avoid reference sharing
        added = true;
      }
    });

    if (!added) {
      console.warn('No matching room found for package:', packages.Nombre, '| Looking for:', habitacionesMatch);
      return;
    }

    // Emit updated reserva — app-reserva subscribes and will re-render
    this._disponibilidadService.changeMiReserva(currentReserva);

    // Recalc payment totals
    this.totalPayment = currentReserva.reduce((sum, reserva) => {
      const roomTotal = reserva.precioTarifa || 0;
      const pkgTotal = reserva.packageList?.reduce((s, p) => s + (p.Precio * p.Cantidad), 0) ?? 0;
      return sum + roomTotal + pkgTotal;
    }, 0);

    this.partialPayment = this.totalPayment * 0.5;
  }


  plus(pkg: any) {
    pkg.selectedCantidad++;
  }

  minus(pkg: any) {
    if (pkg.selectedCantidad > 1) {
      pkg.selectedCantidad--;
    }
  }



// step3.component.ts — update initForm() to include payment fields
initForm(): void {
  this.guestForm = this.fb.group({
    nombre:         ['', [Validators.required, Validators.minLength(3)]],
    telefono:       ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    email:          ['', [Validators.required, Validators.email]],
    confirmaEmail:  ['', [Validators.required, Validators.email]],
    pais:           ['', Validators.required],
    requerimiento:  [''],
    paymentType:    ['', Validators.required],      
    hotelDirect:    [false, Validators.requiredTrue], 
    
  }, {
    validators: this.emailMatchValidator('email', 'confirmaEmail'),
    cardNumber: ['', [
    Validators.required,
    (control:AbstractControl) => {
     const clean = (control.value ?? '').replace(/\D/g, ''); // safety strip, just in case
    if (!clean) return { required: true };
    if (clean.length < 13 || clean.length > 16) return { invalidLength: true };
    if (!this.luhnCheck(clean)) return { invalidCard: true };
    return null;
    }
  ]],
  expiryDate: ['', [Validators.required, this.expiryDateValidator]],
  cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
  });
}

// the Luhn algorithm check (standard credit card validation):
luhnCheck(num: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

  emitValidity(): void {
    // guestForm.valid checks all controls + emailsMismatch cross validator
    // cardForm.valid checks cardNumber + expiryDate + cvv
    const isValid = this.guestForm.valid && this.cardForm.valid;
    console.log('🔍 step3 validity:', {
      guestForm: this.guestForm.valid,
      cardForm: this.cardForm.valid,
      guestErrors: this.guestForm.errors,
      controls: Object.entries(this.guestForm.controls).reduce((acc, [k, v]) => ({
        ...acc,
        [k]: { valid: v.valid, errors: v.errors }
      }), {})
    });
    this.formValid.emit(isValid);
  }

  formatExpiryDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // strip non-digits

    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }

    input.value = value;
    this.cardForm.get('expiryDate')?.setValue(value, { emitEvent: true });
  }

  // Custom validator to check if email and confirmaEmail match
  emailMatchValidator(emailKey: string, confirmEmailKey: string): ValidatorFn {
    return (group: AbstractControl) => {
      const email = group.get(emailKey)?.value;
      const confirmEmail = group.get(confirmEmailKey)?.value;
      return email === confirmEmail ? null : { emailsMismatch: true };
    };
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;

    // Strip non-digits and limit to 16
    const digits = input.value.replace(/\D/g, '').substring(0, 16);

    // Format with dashes every 4 digits
    const formatted = digits.match(/.{1,4}/g)?.join('-') ?? digits;

    // Update DOM first, then set form value with clean digits
    input.value = formatted;

    // Pass only the digits to the form control — validator receives clean value
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

  // Helper method to easily access form controls in template
  get f() {
    return this.guestForm.controls;
  }

  // Custom validator for MM/YY or MM/YYYY expiry format
  expiryDateValidator(control: AbstractControl) {
    if (!control.value) {
      return null;
    }
    // Accept MM/YY or MM/YYYY
    const regex = /^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/;
    if (!regex.test(control.value)) {
      return { invalidExpiryDate: true };
    }
    // Check if date is in the past
    const [month, year] = control.value.split('/');
    const expMonth = parseInt(month, 10);
    let expYear = parseInt(year, 10);
    if (year.length === 2) {
      // Convert YY to 20YY
      expYear += 2000;
    }
    const today = new Date();
    const expiry = new Date(expYear, expMonth - 1, 1);
    expiry.setMonth(expiry.getMonth() + 1); // End of expiry month

    return expiry < today ? { expired: true } : null;
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

      // ── Fetch tarifas arrays needed for ratesTotalCalc ──
      const allTarifas = await firstValueFrom(this._tarifasService.currentData);
      const standardRatesArray = allTarifas.filter(t => t.Tarifa === 'Tarifa Base');
      const tempRatesArray = allTarifas.filter(t => t.Tarifa === 'Tarifa De Temporada');

      const huespedArray: BookingHuesped[] = [];

      for (const reserva of miReserva) {
        const folioStr = folio.Letra + currentFolioValue;

        const llegada = DateTime.fromJSDate(this.checkIn)
          .set({ hour: 15, minute: 0, second: 0 }).toISO()!;
        const salida = DateTime.fromJSDate(this.checkOut)
          .set({ hour: 12, minute: 0, second: 0 }).toISO()!;

        //  Find full tarifa object matching room type and tarifa name
        const fullTarifa = allTarifas.find(t =>
          t.Tarifa === reserva.nombreTarifa &&
          t.Habitacion.includes(reserva.codigoCuarto)
        );

        if (!fullTarifa) {
          console.error(`Tarifa not found for ${reserva.codigoCuarto} - ${reserva.nombreTarifa}`);
          this._spinnerService.loadingState = false;
          return false;
        }

        // ✅ Use ratesTotalCalc exactly like frontend does — produces Spanish date format
        const desgloseEdoCuenta = this._tarifasService.ratesTotalCalc(
          fullTarifa,
          standardRatesArray,
          tempRatesArray,
          reserva.codigoCuarto,
          reserva.cantidadAdultos,
          reserva.cantidadNinos,
          new Date(llegada),
          new Date(salida),
          this.stayNights,
          false,
          false,
          true
        ) ?? [];

        // ✅ Apply promo on top of ratesTotalCalc result
        let finalDesglose = desgloseEdoCuenta as { tarifa: string; fecha: string; tarifaTotal: number }[];
        let finalPendiente = reserva.precioTarifa;

        if (this.validatedPromo) {
          const result = this._promoValidatorService.applyPromo(
            this.validatedPromo,
            finalDesglose,
            finalPendiente,
            this.stayNights,
          );
          finalDesglose = result.desgloseEdoCuenta;
          finalPendiente = result.pendiente;
        }

        const roomsArray = this._disponibilidadService.currentPreAsignadas;
        const room = roomsArray.find(
          r => r.codigo === reserva.codigoCuarto
        );

        const numero = room?.numero ?? '';

        const huesped: BookingHuesped = {
          folio: folioStr,
          adultos: reserva.cantidadAdultos,
          ninos: reserva.cantidadNinos,
          nombre: formData.nombre,
          estatus: 'Reserva Sin Pago',       // ✅
          llegada,
          salida,
          noches: this.stayNights,
          tarifa: fullTarifa,                
          porPagar: finalPendiente,
          pendiente: finalPendiente,
          origen: 'WEB',
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

      const result = await this._bookingReservaService.processBooking(
        huespedArray,
        'America/Mexico_City'
      );

      this._spinnerService.loadingState = false;
      return result.success;

    } catch (err) {
      this._spinnerService.loadingState = false;
      console.error('submitBooking error:', err);
      return false;
    }
  }
}
