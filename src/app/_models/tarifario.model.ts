
export const DEFAULT_VISIBILITY_RATES: VisibilityRates = {
    name:'',
    value:true,
}
export interface tarifarioTabla{
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
    TarifaRack:number,
    Descuento?:number
  }


export interface TarifasDisponibles {
    Activa:boolean,
        Descripcion:string,
        Tarifa_1:number, // Tarifa para una persona
        Tarifa_2:number,// Tarifa para dos persona
        Tarifa_3:number,// Tarifa para tres persona
        Tarifa_N:number,// Tarifa para mas de tres persona
        Dias:{
            rateIndex:number,
            name: string;
            value: number;
            checked: boolean; // si es true la tarifa es valida para este dia de la semana
        }[],
}

export interface Tarifas {
    _id?:string;
    Tarifa:string;
    Habitacion:string[];
    Llegada:Date;
    Salida:Date;
    Plan:string;
    Politicas?:Politicas[];
    EstanciaMinima:number;
    EstanciaMaxima:number;
    TarifaRack?:number;
    Estado:boolean,
    Adultos:number,
    Ninos:number,
    Dias?:{
        name: string;
        value: number;
        checked: boolean;
    }[],
    TarifasActivas:TarifasDisponibles[]
    Visibilidad:VisibilityRates,
    Cancelacion:Politicas[],
    hotel?:string;
    Descuento?:number
}


export interface TarifasRadioButton extends Tarifas {

    checked: boolean;
    TarifaXAdulto?: number[];
    TarifaXNino?: number[];
    
}

export const DEFAULT_TARIFAS: Tarifas = {
    Tarifa:'',
    Habitacion:[],
    Llegada:new Date(),
    Salida:new Date(),
    Plan:'',
    Politicas:[],
    EstanciaMinima:0,
    EstanciaMaxima:0,
    TarifaRack:0,
    Estado:true,
    Adultos:1,
    Ninos:1,
    TarifasActivas:[],
    Visibilidad:DEFAULT_VISIBILITY_RATES,
    Cancelacion:[],
}

export interface Politicas {
    name: string,
    value: boolean
}[]

export interface VisibilityRates {
    name:string,
    value:boolean,
    subTask?:VisibilityRates[]
}

2