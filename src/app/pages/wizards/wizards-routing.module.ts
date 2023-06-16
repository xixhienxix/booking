import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HorizontalComponent } from './horizontal/horizontal.component';
import { WizardsComponent } from './wizards.component';

const routes: Routes = [
  {
    path: '',
    component: WizardsComponent,
    children: [
      {
        path: 'horizontal',
        component: HorizontalComponent,
      },

      { path: '', redirectTo: 'horizontal', pathMatch: 'full' },
      { path: '**', redirectTo: 'horizontal', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WizardsRoutingModule {}
