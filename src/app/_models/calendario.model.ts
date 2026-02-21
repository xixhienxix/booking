import { DateTime } from 'luxon'
import { Promos } from './promos.model';


export interface ICalendario {
  fechaInicial:any,
  fechaFinal:any,
  codigoPromo:string
  adultos:number,
  ninos:number,
  hotel:string;
  validatedPromo?: Promos | null;
}
export let defaultCalendario = {
  fechaInicial:undefined,
  fechaFinal:undefined,
  codigoPromo:'',
  adultos:1,
  ninos:0,
  hotel:""
}


