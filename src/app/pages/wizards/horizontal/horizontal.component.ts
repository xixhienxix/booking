import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ICalendario, defaultCalendario } from 'src/app/_models/calendario.model';
import { ICreateAccount, inits } from '../create-account.helper';
import { IDisponibilidad, defaultDispo } from 'src/app/_models/disponibilidad.model';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { DateTime } from 'luxon';
import { TarifasService } from 'src/app/_service/tarifas.service';
import { ITarifas } from 'src/app/_models/tarifas.model';
@Component({
  selector: 'app-horizontal',
  templateUrl: './horizontal.component.html',
  styleUrls:['./horizontal.component.scss']
})
export class HorizontalComponent implements OnInit, OnDestroy {
  formsCount = 5;
  account$: BehaviorSubject<ICalendario> = new BehaviorSubject<ICalendario>(defaultCalendario);

  tarifasArray:ITarifas[]=[]
  currentStep$: BehaviorSubject<number> = new BehaviorSubject(1);
  isCurrentFormValid$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );
  private unsubscribe: Subscription[] = [];

  constructor(
    private disponibilidadService : DisponibilidadService,
    private tarifasService : TarifasService
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
        this.getTasrifario()
      },
      error=>{
        console.log(error)
      })
        

  }

  getTasrifario(){
    this.tarifasService.getTarifas().subscribe(
      (value)=>{
        this.tarifasArray=[]
        if(value){
          for(let e=0;e<value.length;e++){
            for(let i=0;i<value[e].Habitacion.length;i++){
              let tarifario = {
                  Tarifa:value[e].Tarifa,
                  Habitacion:value[e].Habitacion[i],
                  Llegada:value[e].Llegada,
                  Salida:value[e].Salida,
                  Plan:value[e].Plan,
                  Politicas:value[e].Politicas,
                  EstanciaMinima:value[e].EstanciaMinima,
                  EstanciaMaxima:value[e].EstanciaMaxima,
                  TarifaRack:value[e].TarifaRack,
                  TarifaxPersona:value[e].TarifaxPersona,
                  Dias:value[e].Dias,
                  Estado:value[e].Estado==true ? 'Activa' : 'No Activa',
                  Tarifa_Promedio:0
              }
              if(value[e].Estado==true){
                this.tarifasArray.push(tarifario)
                this.tarifasArrayCompleto.push(tarifario)
              }

          }
        }
       
        this.filtrarTarifario()        
      }
      },
      (error)=>{}
      )
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
