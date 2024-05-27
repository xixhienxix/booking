import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, concat, takeUntil } from 'rxjs';
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

  currentStep$: BehaviorSubject<number> = new BehaviorSubject(1);
  isCurrentFormValid$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );
  private unsubscribe: Subscription[] = [];

  constructor(
    private disponibilidadService : DisponibilidadService,
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

  updateAccount = (part: Partial<ICalendario>, isFormValid: boolean) => {
    const currentAccount = this.account$.value;
    const updatedAccount = { ...currentAccount, ...part };
    this.account$.next(updatedAccount);
    this.isCurrentFormValid$.next(isFormValid);
  };

  buscaDisponibilidad(hotel:string){

    // Calculating the time difference
    // of two dates
    let Difference_In_Time =
        this.account$.value.fechaFinal.getTime() - this.account$.value.fechaInicial.getTime();
    
    // Calculating the no. of days between
    // two dates
    let Difference_In_Days =
        Math.round
            (Difference_In_Time / (1000 * 3600 * 24));

    const request1 = this.disponibilidadService.getDisponibilidadBooking(this.account$.value.fechaInicial,this.account$.value.fechaFinal,Difference_In_Days,hotel);
    const request2 = 
    const request3 = this.tarifasService.getTarifas();

    concat(request1,request2)
    .pipe(takeUntil(this.ngUnsubscribe))
    .subscribe({
      next: (val)=>{
        let cuartosNoDisponibles:string[]=[]

        this.disponibilidadService.changeData(val);
        for(let i=0;i<val.length; i++){
          cuartosNoDisponibles.push(val[i].Habitacion);
        }
        this.disponibilidadService.setCuartosNoDisponibles=cuartosNoDisponibles;
        this.getTasrifario()
      },
      error: (error)=>{

        console.log(error)
      },
      complete: () =>{
        this.spinnerService.loadingState=false    
      }  
    })
  }

  getTasrifario(){
    this.spinnerService.loadingState=true
    this.tarifasService.getTarifas().subscribe(
      (value)=>{
        this.tarifasArray=[]
        this.tarifasArrayCompleto=[]
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
                  Estado: value[e].Estado === true ? 'Activa' : 'No Activa',
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
      (error)=>{},
      ()=>{
        this.spinnerService.loadingState=false
      }
      )
  }

  filtrarTarifario(){

    /**Comparador de Fechas Tarifas */
    this.tarifasArray=this.tarifasArrayCompleto.filter(d => 
      {
        var timeLlegada = DateTime.fromObject({ year: parseInt(d.Llegada.split("/")[2]), month: parseInt(d.Llegada.split("/")[1]), day: parseInt(d.Llegada.split("/")[0])})
        return (this.fromDate >= timeLlegada );
      });

    /**Comparador de Estancias Tarifario */
    this.tarifasArray=this.tarifasArray.filter(x=>{
      var estanciaMinima = x.EstanciaMinima
      var estanciaMaxima = x.EstanciaMaxima
      if(x.EstanciaMaxima==0){
        estanciaMaxima=999
      }
      return (this.diaDif >= estanciaMinima &&  this.diaDif <= estanciaMaxima  )
    })

    /**Elimina Tarifas que no apliquen para el dia de llegada */
    for(let i=0;i<this.tarifasArray.length;i++){
      if(this.tarifasArray[i].Tarifa!='Tarifa Estandar'){
        
        var timeLlegada = DateTime.fromObject({ year: parseInt(this.tarifasArray[i].Llegada.split("/")[2]), month: parseInt(this.tarifasArray[i].Llegada.split("/")[1]), day: parseInt(this.tarifasArray[i].Llegada.split("/")[0])})
        var timeSalida = DateTime.fromObject({ year: parseInt(this.tarifasArray[i].Salida.split("/")[2]), month: parseInt(this.tarifasArray[i].Salida.split("/")[1]), day: parseInt(this.tarifasArray[i].Salida.split("/")[0])})
        
        for(let y=this.fromDate;this.fromDate>=timeLlegada;timeLlegada=timeLlegada.plus({ days: 1 })){
          if(this.fromDate.hasSame(timeLlegada, 'day') && this.fromDate.hasSame(timeLlegada, 'year') && this.fromDate.hasSame(timeLlegada, 'month')){

            var diaDeLlegada = this.fromDate.setLocale("es").weekdayShort
            var diaDeLlegadaMayus = diaDeLlegada!.charAt(0).toUpperCase() + diaDeLlegada!.slice(1);
            
            for(let x=0;x<this.tarifasArray[i].Dias.length;x++){
              if(this.tarifasArray[i].Dias[x].name==diaDeLlegadaMayus && this.tarifasArray[i].Dias[x].checked==false){
                this.tarifasArray = this.tarifasArray.filter( obj => obj.Tarifa !== this.tarifasArray[i].Tarifa);
                break
              }
            }
          }
        }
      }

      this.isLoading=false
      /** */
    }

    this.tarifasService.updateTarifario(this.tarifasArray);


}

  nextStep() {
    const nextStep = this.currentStep$.value + 1;
    if(nextStep === 2){
      this.buscaDisponibilidad(this.account$.value.hotel);
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
