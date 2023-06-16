
export interface IDisponibilidad
{
  Cuarto:string,
  Habitacion:string,
  Estatus:number,
  Dia:number,
  Mes:number,
  Ano:number
  Estatus_Ama_De_Llaves:string,
  Folio_Huesped:number,
  Fecha?:string
}

export let defaultDispo: IDisponibilidad = {
  Cuarto:'',
  Habitacion:'',
  Estatus:1,
  Dia:1,
  Mes:1,
  Ano:2023,
  Estatus_Ama_De_Llaves:'',
  Folio_Huesped:1,
  Fecha:''
};
