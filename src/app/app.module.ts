import { NgModule,  APP_INITIALIZER, Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements'
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
import { InlineSVGModule } from 'ng-inline-svg-2';

function initHotelConfig(configService: HotelConfigService) {
  return () => configService.load();
}
@NgModule({
  declarations: [AppComponent],
  imports: [
    InlineSVGModule.forRoot(),
    HttpClientModule,
    MatCardModule,
    AppRoutingModule,
    MatButtonModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatDatepickerModule,
    BrowserModule,
    BrowserAnimationsModule,
  ],
  providers: [
    HotelConfigService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HotelInterceptor,
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initHotelConfig,
      deps: [HotelConfigService],
      multi: true
    }
  ],
    bootstrap: [AppComponent] 
})
export class AppModule {
}