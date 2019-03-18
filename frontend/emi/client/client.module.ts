import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';
import { CurrencyMaskModule } from 'ng2-currency-mask';
import { ClientService } from './client.service';
import { ClientListService } from './client-list/client-list.service';
import { ClientListComponent } from './client-list/client-list.component';
import { ClientDetailService } from './client-detail/client-detail.service';
import { ClientDetailComponent } from './client-detail/client-detail.component';
import { ClientDetailGeneralInfoComponent } from './client-detail/general-info/client-general-info.component';
import { ToolbarService } from '../../toolbar/toolbar.service';
import { DialogComponent } from './dialog/dialog.component';
import { ClientLocationComponent } from './client-detail/location/client-location.component';
import { ClientAuthComponent } from './client-detail/auth-credentials/client-auth.component';
import { ClientSatelliteComponent } from './client-detail/satellite/client-satellite.component';
import { ClientAutocompleteComponent } from './client-detail/satellite/client-autocomplete/client-autocomplete.component';


const routes: Routes = [
  {
    path: '',
    component: ClientListComponent,
  },
  {
    path: ':id',
    component: ClientDetailComponent,
  }
];



@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule,
    CurrencyMaskModule
  ],
  declarations: [
    DialogComponent,
    ClientListComponent,
    ClientDetailComponent,
    ClientDetailGeneralInfoComponent,
    ClientAuthComponent,
    ClientSatelliteComponent,
    ClientLocationComponent,
    ClientAutocompleteComponent
  ],
  entryComponents: [DialogComponent],
  providers: [ ClientService, ClientListService, ClientDetailService, DatePipe]
})

export class ClientModule {}
