import { Component, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, concat, firstValueFrom, takeUntil } from 'rxjs';
import { ICalendario, defaultCalendario } from 'src/app/_models/calendario.model';
import { ICreateAccount, inits } from '../create-account.helper';
import { IDisponibilidad, defaultDispo } from 'src/app/_models/disponibilidad.model';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { DateTime } from 'luxon';
import { TarifasService } from 'src/app/_service/tarifas.service';
import { ITarifas } from 'src/app/_models/tarifas.model';
import { tarifarioTabla } from 'src/app/_models/tarifario.model';
import { SpinnerService } from 'src/app/_service/spinner.service';
import { Ihoteles } from 'src/app/_models/hoteles.model';
import { PromosBookingService } from 'src/app/_service/promos.service';
import { Promos } from 'src/app/_models/promos.model';
import { Step1Component } from '../steps/step1/step1.component';
import { HabitacionesService } from 'src/app/_service/habitacion.service';
import { Step3Component } from '../steps/step3/step3.component';

@Component({
  selector: 'app-horizontal',
  templateUrl: './horizontal.component.html',
  styleUrls:['./horizontal.component.scss']
})
export class HorizontalComponent implements OnInit, OnDestroy {
  formsCount = 4;
  account$: BehaviorSubject<ICalendario> = new BehaviorSubject<ICalendario>(defaultCalendario);
  private ngUnsubscribe = new Subject<void>();

  tarifasArray:tarifarioTabla[]=[]
  tarifasArrayCompleto:tarifarioTabla[]=[]
  fromDate: DateTime;
  diaDif:number=1;
  isLoading:boolean=false
  listaHoteles:Ihoteles[]=[]

  isStep1FormValid: boolean = false;

  intialDate:Date
  endDate:Date

  qty:number=1;
  qtyNin:number=0

  step3Valid = false;


  currentStep$: BehaviorSubject<number> = new BehaviorSubject(1);
  isCurrentFormValid$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );
  
  @ViewChild(Step1Component) step1!: Step1Component;
  @ViewChild(Step3Component) step3!: Step3Component;

  constructor(
    private _disponibilidadService : DisponibilidadService,
    private tarifasService : TarifasService,
    private spinnerService : SpinnerService,
    private _promosBookingService: PromosBookingService,  
    private _habitacionService: HabitacionesService
  ) {
    this.spinnerService.isLoading$.subscribe((val)=>{
      this.isLoading=val
    }
    )
  }

  ngOnInit(): void {
    this.spinnerService.loadingState=true
    this._promosBookingService.fetchPromos().subscribe();
    this._habitacionService.getHabitaciones().subscribe();

    this.currentStep$.subscribe(step => {
        switch (step) {
          case 1: this.isCurrentFormValid$.next(this.isStep1FormValid); break;
          case 3: this.isCurrentFormValid$.next(this.step3Valid); break;
          default: this.isCurrentFormValid$.next(true); break;
        }
      });
  }

  onPromoValidated(promo: Promos | null): void { 
    this.account$.next({ ...this.account$.value, validatedPromo: promo });
    this._disponibilidadService.changeValidatedPromo(promo);
  }

  handleStep1FormValidity(isValid: boolean) {
    this.isStep1FormValid = isValid;
  }

  updateAccount = (part: Partial<ICalendario>, isFormValid: boolean) => {
    const currentAccount = this.account$.value;
    const updatedAccount = { ...currentAccount, ...part };
    this.account$.next(updatedAccount);
    this.isCurrentFormValid$.next(isFormValid);
  };


  onDateRangeChange(event:any){
    console.log(event)
  }

  onQuantityChange($event:any){
    this.qty = $event.qty
    this.qtyNin = $event.qtyNin
  }

async nextStep() {
  const currentStep = this.currentStep$.value;

  if (currentStep === 1) {
    const promoOk = this.step1.checkPromoCode();
    if (!promoOk) return;
  }

  // ── Step 3 gate: validate form AND save reservation ──
  if (currentStep === 3) {
    this.step3.guestForm.markAllAsTouched();
    this.step3.cardForm.markAllAsTouched();
    if (!this.step3.guestForm.valid || !this.step3.cardForm.valid) return;

    // Save to database before advancing to confirmation
    const saved = await this.step3.submitBooking();
    if (!saved) {
      // Show error — don't advance
      console.error('Reservation could not be saved');
      return;
    }
  }

  const nextStep = currentStep + 1;
  if (nextStep > this.formsCount) return;

  if (nextStep === 2) {
    const currentData: ICalendario = { ...this.account$.value };
    this.intialDate = currentData.fechaInicial;
    this.endDate = currentData.fechaFinal;

    const result = await firstValueFrom(
      this._disponibilidadService.getDisponibilidad(this.account$.value)
    );

    const currentHabs = this._habitacionService.currentHabitaciones;
    const validatedPromo = this.account$.value.validatedPromo ?? null;
    let filteredResult: string[] = result;

    if (validatedPromo && validatedPromo.habs?.length > 0) {
      filteredResult = result.filter((roomNumero: string) => {
        const roomObj = currentHabs.find((h: any) => h.Numero === roomNumero);
        if (!roomObj) return false;
        return validatedPromo.habs.includes(roomObj.Codigo);
      });
    }

    const dispoResponse = await this._disponibilidadService.calcHabitacionesDisponibles(
      filteredResult, currentData.fechaInicial, currentData.fechaFinal, '1'
    );

    const tarifasArray = await this.tarifasService.roomRates(
      currentData.fechaInicial, currentData.fechaFinal
    );
  }

  this.currentStep$.next(nextStep);
}

  prevStep() {
    const prevStep = this.currentStep$.value - 1;
    if (prevStep === 0) {
      return;
    }
    this.currentStep$.next(prevStep);
  }

  honQtyHabsUpdate(numeroHabs:number){
    this._disponibilidadService.changeCurrentNumeroHabs(numeroHabs);
  }

  updateStep3Validity(isValid: boolean) {
    this.step3Valid = isValid;
    if (this.currentStep$.value === 3) {
      this.isCurrentFormValid$.next(isValid);
    }
  }

  updateCurrentFormValid() {
    // Example logic if you have an Observable or BehaviorSubject for isCurrentFormValid$
    if (this.currentStep$.value === 3) {
      this.isCurrentFormValid$.next(this.step3Valid);
    } else {
      // handle other steps form validities
    }
  }


  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();    
  }
}
