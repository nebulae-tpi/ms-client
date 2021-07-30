////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';

import { Router, ActivatedRoute } from '@angular/router';

////////// RXJS ///////////
import { map, mergeMap, tap, takeUntil, take } from 'rxjs/operators';
import { Subject, of} from 'rxjs';

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar
} from '@angular/material';

//////////// i18n ////////////
import {
  TranslateService
} from '@ngx-translate/core';
import { locale as english } from '../i18n/en';
import { locale as spanish } from '../i18n/es';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';

//////////// Other Services ////////////
import { KeycloakService } from 'keycloak-angular';
import { ClientDetailService } from './client-detail.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'client',
  templateUrl: './client-detail.component.html',
  styleUrls: ['./client-detail.component.scss']
})
// tslint:disable-next-line:class-name
export class ClientDetailComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  pageType: string;
 
  client: any;

  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private formBuilder: FormBuilder,
    public snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private ClientDetailservice: ClientDetailService,
    private route: ActivatedRoute
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.loadclient();
    this.subscribeClientUpdated();
    this.stopWaitingOperation();
  }

  loadclient(){
    this.route.params
    .pipe(
      map(params => params['id']),
      mergeMap(entityId => entityId !== 'new' ?
        this.ClientDetailservice.getClientClient$(entityId).pipe(
          map(res => res.data.ClientClient)
        ) : of(null)
      ),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe((client: any) => {
      this.client = JSON.parse(JSON.stringify(client));
      this.pageType = (client && client._id) ? 'edit' : 'new'
    }, e => console.log(e));
  }
  
  subscribeClientUpdated(){
    this.ClientDetailservice.subscribeClientClientUpdatedSubscription$()
    .pipe(
      tap(r => console.log(r) ),
      map(subscription => subscription.data.ClientClientUpdatedSubscription),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe((client: any) => {
      this.checkIfEntityHasBeenUpdated(client);
    })
  }

  checkIfEntityHasBeenUpdated(newclient){
    if(this.ClientDetailservice.lastOperation == 'CREATE'){

      //Fields that will be compared to check if the entity was created
      if(newclient.generalInfo.name == this.ClientDetailservice.client.generalInfo.name 
        && newclient.generalInfo.description == this.ClientDetailservice.client.generalInfo.description){
        //Show message entity created and redirect to the main page
        this.showSnackBar('CLIENT.ENTITY_CREATED');
        this.router.navigate(['client/']);
      }

    }else if(this.ClientDetailservice.lastOperation == 'UPDATE'){
      // Just comparing the ids is enough to recognise if it is the same entity
      if(newclient._id == this.client._id){
        //Show message entity updated and redirect to the main page
        this.showSnackBar('CLIENT.ENTITY_UPDATED');
        //this.router.navigate(['client/']);
      }

    }else{
      if(this.client != null && newclient._id == this.client._id){
        //Show message indicating that the entity has been updated
        this.showSnackBar('CLIENT.ENTITY_UPDATED');
      }
    }
  }

  stopWaitingOperation(){
    this.ngUnsubscribe.pipe(
      take(1),
      mergeMap(() => this.ClientDetailservice.resetOperation$())
    ).subscribe(val => {
      //console.log('Reset operation');
    })
  }

  showSnackBar(message) {
    this.snackBar.open(this.translationLoader.getTranslate().instant(message),
      this.translationLoader.getTranslate().instant('CLIENT.CLOSE'), {
        duration: 2000
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
