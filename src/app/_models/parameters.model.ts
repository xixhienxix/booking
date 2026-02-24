export interface PARAMETERS {
    _id?: string;
    room_auto_assign:boolean;
    hotel: string;
}
export const DEFAULT_PARAMETERS: PARAMETERS = {
    room_auto_assign: true,
    hotel:''
}