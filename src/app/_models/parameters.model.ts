export interface PARAMETERS {
    _id?: string;
    room_auto_assign:boolean;
    hotel: string;
}
export const DEFAULT_PARAMETERS: PARAMETERS = {
    room_auto_assign: true,
    hotel:''
}

export interface Parametros_Front {
    _id?:string,
    iva:number,
    ish:number,
    divisa:string,
    zona:string,
    noShow:string,
    checkOut:string,
    checkIn:string,
    codigoZona:string,
    id?:string,
    hotel?:string;
    tarifasCancelacion?:string;
    autoCheckOut?:boolean;
    noShowAutoUpdated?:boolean;
    inventario:number;
    iddleTimer:number;
    maxPersonas:number;
    cuenta:string;
    nombre_cuenta:string;
    clabe:string;
    fecha_limite_pago:number;
    wifi:string;
    wifiPass:string;
    infoAdicional:string;
    paginaWeb:string;
    urlMapa:string;
    whatsapp:string;
    multa:number;
    depositType?: 'percentage' | 'quantity';
    depositValue?: number;

}
export const PARAMETROS_FRONT_DEFAULT_VALUES:Parametros_Front = {
    iva:16,
    ish:3,
    divisa:'Peso',
    zona:'America/Mexico_City',
    noShow:'11:00',
    checkOut:'12:00',
    checkIn:'01:00',
    codigoZona:'-05:00',
    inventario:10,
    iddleTimer:5,
    maxPersonas:10,
    cuenta:'0000000000',
    nombre_cuenta:'',
    clabe:'000000000000000000',
    fecha_limite_pago:1,
    wifi:'WIFI!"#',
    wifiPass:'123',
    infoAdicional:'',
    paginaWeb:'',
    urlMapa:'',
    whatsapp:'',
    multa:0,
    depositType:'percentage',
    depositValue:0
}
