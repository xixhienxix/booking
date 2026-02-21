export interface Promos {
    _id?:string;
    estado:boolean;
    tipo:number;
    nombre: string;
    habs:string[];
    codigo: string;
    qtyPrecio: number;
    discountType: boolean; // true = Percentage / false =  qty
    inventario: number;
    minNoches: number;
    maxNoches: number;
    desc: string;
    anticipatedNights: number;
    anticipatedNightsmax: number;
    payonly: number;
    stay: number;
    selectedDays: string[];
    hotel: string;
    intialDateFCCheckIn: string, // Add this
    endDateFCCheckIn: string, // Add this
    intialDateFC: string, 
    endDateFC: string,
}

export const PROMO_DEFAULT = {
    estado:true,
    tipo:1,
    nombre:'',
    habs:[],
    codigo: '',
    qtyPrecio: 1,
    discountType: true, // true = Percentage / false =  qty
    inventario: 0,
    minNoches: 0,
    maxNoches: 0,
    desc: '',
    anticipatedNights: 0,
    anticipatedNightsmax: 0,
    payonly: 0,
    stay: 0,
    selectedDays: [],
    hotel: '',
    intialDateFCCheckIn: '', // Add this
    endDateFCCheckIn: '', // Add this
    intialDateFC: '', 
    endDateFC: '',
}