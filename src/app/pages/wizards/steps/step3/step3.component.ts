import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { combineLatest, map, Subscription, switchMap, tap } from 'rxjs';
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
  constructor(private _packagesServices: PackagesService, private _disponibilidadService: DisponibilidadService, private fb: FormBuilder) { }

  @Input('updateParentModel') updateParentModel: (part: Partial<ICalendario>, isFormValid: boolean) => void;

  packagesList: PackagesSimplex[] = [];
  selectedQuantity = 1; // default value
  guestForm: FormGroup
  quantity = 1;



  ngOnInit() {
    this.initForm();


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
      nombre: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      confirmaEmail: ['', [Validators.required, Validators.email]],
      pais: ['mexico', Validators.required],
      lenguaje: ['es', Validators.required],
      requerimiento: ['']
    });
  }
}
