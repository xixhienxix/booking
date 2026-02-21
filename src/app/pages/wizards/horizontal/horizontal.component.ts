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

@Component({
  selector: 'app-horizontal',
  templateUrl: './horizontal.component.html',
  styleUrls:['./horizontal.component.scss']
})
export class HorizontalComponent implements OnInit, OnDestroy {
  formsCount = 5;
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

  // ── Step 1 gate ──
  if (currentStep === 1) {
    const promoOk = this.step1.checkPromoCode();
    if (!promoOk) return; // only blocks if a code was entered AND is invalid
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

    // ── Only filter if a promo was actually validated ──
    let filteredResult: string[] = result;

    if (validatedPromo && validatedPromo.habs?.length > 0) {
      filteredResult = result.filter((roomNumero: string) => {
        const roomObj = currentHabs.find((h: any) => h.Numero === roomNumero);
        if (!roomObj) return false;
        return validatedPromo.habs.includes(roomObj.Codigo);
      });

      console.log(`🎟 Promo filter — allowed: [${validatedPromo.habs.join(', ')}] | ${result.length} → ${filteredResult.length} rooms`);
    }
    // ── No promo: filteredResult === result, all rooms shown ──

    const dispoResponse = await this._disponibilidadService.calcHabitacionesDisponibles(
      filteredResult,
      currentData.fechaInicial,
      currentData.fechaFinal,
      '1'
    );

    const tarifasArray = await this.tarifasService.roomRates(
      currentData.fechaInicial,
      currentData.fechaFinal
    );

    const preAsignadasArray = dispoResponse.preAsignadasArray;
    const availavilityRooms = dispoResponse.avaibilityRooms;
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
  this.updateCurrentFormValid();
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
