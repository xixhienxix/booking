import { Component, OnInit } from '@angular/core';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { DateTime } from 'luxon'
import { combineLatest, concat, forkJoin } from 'rxjs';
import { miReserva } from 'src/app/_models/mireserva.model';
@Component({
  selector: 'app-reserva',
  templateUrl: './reserva.component.html',
  styleUrls: ['./reserva.component.scss']
})
export class ReservaComponent implements OnInit {
  constructor(    private _disponibilidadService : DisponibilidadService
    ){
  }

  fechaInicial:string=''
  fechaFinal:string=''
  diff:number
  fechaIniDateTime:DateTime;
  FechaFinDateTime:DateTime;
  miReserva:miReserva[]=[];
  subtotal:number=0;
  impuestos:number=0;

  ngOnInit(){

    combineLatest([this._disponibilidadService.currentFechaIni,this._disponibilidadService.currentFechaFin]).subscribe((val)=>{
      // this.fechaInicial=val[0].toLocaleString(DateTime.DATETIME_SHORT).split(',')[0]
      // this.fechaIniDateTime=val[0]
/*       this.fechaFinal=val[1].toLocaleString(DateTime.DATETIME_SHORT).split(',')[0]
      this.FechaFinDateTime=val[1] */

      const diff = this.FechaFinDateTime.diff(this.fechaIniDateTime, ["days"]).toObject().days
      if(diff!=undefined){
        this.diff=diff
      }

    })
    this._disponibilidadService.currentReserva.subscribe(val=>{
      this.miReserva=val
      for(let i=0;i<val.length;i++){
          this.subtotal+=(val[i].precioTarifa*this.diff)
          this.impuestos = (this.subtotal* 16)/100
        
      }
    })
    
  }

  pop(index:number){
    if(index===0){
      this.miReserva=[]
      this.subtotal=0
      this.impuestos=0;
    }else{
      this.miReserva=this.miReserva.splice(index,1)
    }
    this._disponibilidadService.changeMiReserva(this.miReserva)
  }

}
