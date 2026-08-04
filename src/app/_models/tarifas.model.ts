export interface ITarifas  {
    _id?:string;
    Tarifa:string;
    Habitacion:string[];
    Llegada:string;
    Salida:string;
    Plan:string;
    Politicas:string;
    EstanciaMinima:number;
    EstanciaMaxima:number;
    TarifaRack:number;
    TarifaxPersona:number[];
    Activa?:boolean;
    Descuento?:number;
    Estado:boolean
    Dias:{
        name: string;
        value: number;
        checked: boolean;
    }[],
    PlanAlimentos?: string;
    FlexibilidadLogistica?: string;
    FormaPago?: PagoOption[];
}

export interface PagoOption {
  name: string;
  value: boolean;
}

export const DEFAULT_PAGO_OPTIONS = {
    name:"",
    value:false
}

export interface TarifaFeature {
    label: string;
    icon: string;
    type: 'payment' | 'cancelation' | 'food' | 'logistics';
}