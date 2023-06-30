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