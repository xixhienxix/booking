import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ICalendario, defaultCalendario } from 'src/app/_models/calendario.model';
import { ICreateAccount, inits } from '../create-account.helper';
import { IDisponibilidad, defaultDispo } from 'src/app/_models/disponibilidad.model';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { DateTime } from 'luxon';
@Component({
  selector: 'app-horizontal',
  templateUrl: './horizontal.component.html',
  styleUrls:['./horizontal.component.scss']
})
export class HorizontalComponent implements OnInit, OnDestroy {
  formsCount = 5;
  account$: BehaviorSubject<ICalendario> = new BehaviorSubject<ICalendario>(defaultCalendario);

  currentStep$: BehaviorSubject<number> = new BehaviorSubject(1);
  isCurrentFormValid$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );
  private unsubscribe: Subscription[] = [];

  constructor(
    private disponibilidadService : DisponibilidadService
  ) {}

  ngOnInit(): void {

  }

  updateAccount = (part: Partial<ICalendario>, isFormValid: boolean) => {
    const currentAccount = this.account$.value;
    const updatedAccount = { ...currentAccount, ...part };
    this.account$.next(updatedAccount);
    this.isCurrentFormValid$.next(isFormValid);
  };

  buscaDisponibilidad(busca:boolean){

    let fechaInicial: DateTime = this.account$.value.fechaInicial
    let fechaFinal: DateTime = this.account$.value.fechaFinal
    let diaDif = fechaFinal.diff(fechaInicial, ["years", "months", "days", "hours"])

    const comparadorInicialString=fechaInicial.day+'/'+fechaInicial.month+'/'+fechaInicial.year
    const comparadorFinalString=fechaFinal.day+'/'+fechaFinal.month+'/'+fechaFinal.year


    this.disponibilidadService.getDisponibilidadBooking(comparadorInicialString,comparadorFinalString,diaDif.days).subscribe(val=>{
        this.disponibilidadService.changeData(val );
      },
      error=>{
        console.log(error)
      })

  }

  nextStep() {
    const nextStep = this.currentStep$.value + 1;
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

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
