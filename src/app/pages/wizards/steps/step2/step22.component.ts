import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { map, Subscription } from 'rxjs';
import { ICalendario } from 'src/app/_models/calendario.model';
import { IDisponibilidad } from 'src/app/_models/disponibilidad.model';
import { IHabitaciones } from 'src/app/_models/habitaciones.model';
import { preAsigModel } from 'src/app/_models/preasig.model';
import { HabitacionesService} from '../../../../_service/habitacion.service'

type tarifarioTabla={
  Habitacion:string,
  Tarifa:string,
  Dias:{
    name: string;
    value: number;
    checked: boolean;
  }[],
  Estado:string,
  EstanciaMaxima:number,
  EstanciaMinima:number,
  Llegada:string,
  Plan:string,
  Politicas:string,
  Salida:string,
  TarifaxPersona:number[]
  Tarifa_Promedio:number,
  TarifaRack:number
}

@Component({
  selector: 'app-step2',
  styleUrls:['./step2.component.scss'],
  templateUrl: './step2.component.html',
})
export class Step2Component implements OnInit, OnDestroy {
  @Input('updateParentModel') updateParentModel: (
    part: Partial<ICalendario>,
    isFormValid: boolean
  ) => void;
  form: FormGroup;
  @Input() defaultValues: Partial<ICalendario>;
  @Input() disponibilidad: Partial<IDisponibilidad>;

  bandera:boolean=false;
  styleDisponibilidad:string='background-color:#99d284;'
  maximoDePersonas:boolean=false
  personasXCuarto:any[]=[];
  accordionDisplay="";
  step = 0;
  mySet = new Set();
  cuarto:string;
  tarifasArray:tarifarioTabla[]=[];
  tarifaSeleccionada:any=[];
  tarifasArrayCompleto:tarifarioTabla[]=[];
  tarifaEstandarSeleccionada:tarifarioTabla
  cuartos:IHabitaciones[]=[];
  preAsig = new Set<preAsigModel>();
  quantity:number=1;
  quantityNin:number=0;
  infoCuarto:IHabitaciones[]=[];
  maxNinos:number=6;
  diaDif:number=1;
  inforCuartoyNombre:any=[]
  public codigoCuarto:IHabitaciones[]=[];

  private unsubscribe: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    public habitacionService : HabitacionesService,
    ) {}

  ngOnInit() {
    this.initForm();
    this.getDispo();
    this.updateParentModel({}, this.checkForm());

  }

  initForm() {
    this.form = this.fb.group({
      accountTeamSize: ['',[Validators.required],
      ],

    });

    const formChangesSubscr = this.form.valueChanges.subscribe((val) => {
      this.updateParentModel(val, this.checkForm());
    });
    this.unsubscribe.push(formChangesSubscr);
  }

  checkForm() {
    return !this.form.get('accountName')?.hasError('required');
  }

  tarifaRadioButton(tarifa:any){
    this.tarifaSeleccionada=tarifa
    for(let i=0;i<this.tarifasArrayCompleto.length;i++){
      if(this.tarifasArrayCompleto[i].Tarifa=='Tarifa Estandar'){
        for(let x=0;x<this.tarifasArrayCompleto[i].Habitacion.length;x++){
          if(this.tarifasArrayCompleto[i].Habitacion[x]==this.cuarto){
            this.tarifaEstandarSeleccionada=this.tarifasArrayCompleto[i]
          }
        }
      }
    }
  }

  preAsignar(numeroCuarto:string,codigo:string,event:any)
  {

    //  this.huesped.tarifa=;

    if(event)
    {
      this.preAsig.add({habitacion:numeroCuarto,codigo:codigo});
      // this.tempCheckBox=true
    }
    else
    {
      this.preAsig.forEach(item =>
        {
          if (item.codigo === codigo && item.habitacion === numeroCuarto)
              this.preAsig.delete(item);
            });
    }

    this.findInvalidControlsRecursive(this.form);

    const sb = this.habitacionService.getInfoHabitaciones(numeroCuarto,codigo)
    .subscribe((infoCuartos:any)=>{
      this.infoCuarto=infoCuartos
    });

    this.unsubscribe.push(sb)

    if(this.quantity>this.infoCuarto[0].Personas)
    {
      this.form.controls['adultos'].updateValueAndValidity();
      this.maxNinos=this.infoCuarto[0].Personas
      this.maxNinos=this.infoCuarto[0].Personas_Extra
    }


  }

    //CheckEstatus Controls
    public findInvalidControlsRecursive(formToInvestigate:FormGroup):string[] {
      var invalidControls:string[] = [];
      let recursiveFunc = (form:FormGroup) => {
        Object.keys(form.controls).forEach(field => {
          const control = form.get(field);
          if (control!.invalid) invalidControls.push(field);
          if (control instanceof FormGroup) {
            recursiveFunc(control);
          }
        });
      }
      recursiveFunc(formToInvestigate);
      return invalidControls;
    }

  getDispo()
  {
    const sb = this.habitacionService.getCodigohabitaciones()
    .pipe(map(
      (responseData)=>{
        const postArray = []
        for(const key in responseData)
        {
          if(responseData.hasOwnProperty(key))
          postArray.push(responseData[key]);
        }
        return postArray
      }))
      .subscribe((codigoCuarto)=>{
        this.codigoCuarto=(codigoCuarto)
      })
      this.unsubscribe.push(sb)

  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
