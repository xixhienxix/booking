export interface ITarifas  {
    _id:string,
    Tarifa:string,
    Habitacion:[],
    Llegada:string,
    Salida:string,
    Plan:string,
    Politicas:string,
    EstanciaMinima:number,
    EstanciaMaxima:number,
    TarifaRack:number,
    TarifaxPersona:[],
    Estado:{type:Boolean},
    Dias:[],
    Descuento:number
}