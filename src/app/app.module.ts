import { NgModule,  APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http'
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { AppRoutingModule } from './app-routing.module';
import { HotelInterceptor } from './_interceptor/http.interceptor';
import {MatCardModule} from '@angular/material/card';
import { HotelConfigService } from './_service/hotel-config.service';
function initHotelConfig(configService: HotelConfigService) {
  return () => configService.load();
}
@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    HttpClientModule,
    MatCardModule,
    AppRoutingModule,
    MatButtonModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatDatepickerModule,
    BrowserModule,
    BrowserAnimationsModule
  ],
  providers: [
    {    
      provide: HTTP_INTERCEPTORS,
      useClass: HotelInterceptor,
      multi:true
    },
    {
      provide: APP_INITIALIZER,
      useFactory:initHotelConfig,
      deps: [HotelConfigService],
      multi:true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
