import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { combineLatest, map, startWith, Subscription, switchMap, tap } from 'rxjs';
import { ICreateAccount } from '../../create-account.helper';
import { ICalendario } from 'src/app/_models/calendario.model';
import { PackagesService } from 'src/app/_service/packages.service';
import { Packages } from 'src/app/_models/packages.model';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { miReserva } from 'src/app/_models/mireserva.model';
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

  constructor(private _packagesServices: PackagesService, private _disponibilidadService: DisponibilidadService, private fb: FormBuilder) {
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



  ngOnInit() {
    this.initForm();

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
    const currentReserva = this._disponibilidadService.getMiReserva();

    currentReserva.forEach(item => {
      if (item.codigoCuarto === packages.habitacionesMatch[0]) {
        // Initialize packageList if missing
        if (!item.packageList) {
          item.packageList = [];
        }
        const { habitacionesMatch, selectedCantidad, ...packageToAdd } = packages;

        packageToAdd.Cantidad = selectedCantidad ?? 1
        item.packageList.push(packageToAdd);
      }
    });

    this._disponibilidadService.changeMiReserva([...currentReserva]);

    this.totalPayment = this.totalPayment = currentReserva.reduce((sum, reserva) => {
      // Sum precioTarifa
      const roomTotal = reserva.precioTarifa || 0;

      // Sum packageList total (Precio * Cantidad)
      const packagesTotal = reserva.packageList?.reduce((pkgSum, pkg) => {
        return pkgSum + (pkg.Precio * pkg.Cantidad);
      }, 0) || 0;

      return sum + roomTotal + packagesTotal;
    }, 0);

    this.partialPayment = this.totalPayment * .5
  }


  plus(pkg: any) {
    pkg.selectedCantidad++;
  }

  minus(pkg: any) {
    if (pkg.selectedCantidad > 1) {
      pkg.selectedCantidad--;
    }
  }



  initForm(): void {
    this.guestForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],

      telefono: ['', [Validators.pattern(/^[0-9]{10}$/)]],  // Optional but must be 10 digits if entered

      email: ['', [Validators.required, Validators.email]],

      confirmaEmail: ['', [Validators.required, Validators.email]],

      pais: ['', Validators.required],

      lenguaje: ['', Validators.required],

      requerimiento: ['']
    }, {
      validators: this.emailMatchValidator('email', 'confirmaEmail')
    });
  }

  // Custom validator to check if email and confirmaEmail match
  emailMatchValidator(emailKey: string, confirmEmailKey: string): ValidatorFn {
    return (group: AbstractControl) => {
      const email = group.get(emailKey)?.value;
      const confirmEmail = group.get(confirmEmailKey)?.value;
      return email === confirmEmail ? null : { emailsMismatch: true };
    };
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
}
