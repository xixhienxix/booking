
export interface Habitacion
{
  _id:string,
  Codigo:string,
  Numero:string[],
  Tipo:string,
  Descripcion:string,
  Personas:number,
  Adultos:number;
  Ninos:number;
  Inventario:number,
  Vista:string,
  Camas:number,
  Tipos_Camas:string[],
  Amenidades:string[],
  Orden:Number,
  Tarifa:number,
  URL?: string;
  hotel?:string;
  Color?:string;
  Estatus:string;
}
export const DEFAULT_HAB = {
  _id:'',
  Codigo:'',
  Numero:[],
  Tipo:'',
  Descripcion:'',
  Personas:1,
  Adultos:1,
  Ninos:0,
  Inventario:1,
  Vista:'',
  Camas:1,
  Tipos_Camas:[],
  Amenidades:[],
  Orden:1,
  Tarifa:0,
  Estatus:'LIMPIA'
}
