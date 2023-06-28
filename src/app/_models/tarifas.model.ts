export interface ITarifas  {
    Tarifa:string;
    Habitacion:string[];
    Llegada:string;
    Salida:string;
    Plan:string;
    Politicas:string;
    EstanciaMinima:number;
    EstanciaMaxima:number;
    TarifaRack:number;
    TarifaxPersona:number[]
    Estado:boolean
    Dias:{
        name: string;
        value: number;
        checked: boolean;
    }[]
}