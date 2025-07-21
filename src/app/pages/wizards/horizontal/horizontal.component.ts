import { Component, OnDestroy, OnInit, Output } from '@angular/core';
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
import { HabitacionesService } from 'src/app/_service/habitacion.service';
import { Ihoteles } from 'src/app/_models/hoteles.model';

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


  currentStep$: BehaviorSubject<number> = new BehaviorSubject(1);
  isCurrentFormValid$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );


  constructor(
    private _disponibilidadService : DisponibilidadService,
    private tarifasService : TarifasService,
    private spinnerService : SpinnerService,
    private habitacionService : HabitacionesService
  ) {
    this.spinnerService.isLoading$.subscribe((val)=>{
      this.isLoading=val
    }
    )
  }

  ngOnInit(): void {
    this.spinnerService.loadingState=true
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

  // buscaDisponibilidad(hotel:string){
  // }

  // getTasrifario(){
  // }

  // filtrarTarifario(){
  // }

  async nextStep() {
    const nextStep = this.currentStep$.value + 1;
    if(nextStep === 2){
      const currentData:ICalendario = {
        ...this.account$.value
      }
    this.intialDate = currentData.fechaInicial 
    this.endDate = currentData.fechaFinal

    const result = await firstValueFrom(this._disponibilidadService.getDisponibilidad(this.account$.value));
    const dispoResponse = await this._disponibilidadService.calcHabitacionesDisponibles(result, currentData.fechaInicial, currentData.fechaFinal, '1');
    const tarifasArray = await this.tarifasService.roomRates(currentData.fechaInicial, currentData.fechaFinal)
    const preAsignadasArray = dispoResponse.preAsignadasArray
    const availavilityRooms = dispoResponse.avaibilityRooms

    console.log('result');

    }
    if (nextStep > this.formsCount) {
      return;
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
  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();    
  }
}
