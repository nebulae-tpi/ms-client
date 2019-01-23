import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { msnamepascalService } from './msname.service';
import { msnamepascalListService } from './msname-list/msname-list.service';
import { msnamepascalListComponent } from './msname-list/msname-list.component';
import { msnamepascalDetailService } from './msname-detail/msname-detail.service';
import { msnamepascalDetailComponent } from './msname-detail/msname-detail.component';
import { msnamepascalDetailGeneralInfoComponent } from './msname-detail/general-info/msname-general-info.component';
import { ToolbarService } from '../../toolbar/toolbar.service';
import { DialogComponent } from './dialog/dialog.component';

const routes: Routes = [
  {
    path: '',
    component: msnamepascalListComponent,
  },
  {
    path: ':id',
    component: msnamepascalDetailComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    DialogComponent,
    msnamepascalListComponent,
    msnamepascalDetailComponent,
    msnamepascalDetailGeneralInfoComponent
  ],
  entryComponents: [DialogComponent],
  providers: [ msnamepascalService, msnamepascalListService, msnamepascalDetailService, DatePipe]
})

export class msnamepascalModule {}
