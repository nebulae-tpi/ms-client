////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Input
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  FormArray
} from '@angular/forms';

import { Router, ActivatedRoute } from '@angular/router';

////////// RXJS ///////////
import {
  map,
  mergeMap,
  switchMap,
  toArray,
  filter,
  tap,
  takeUntil,
  startWith,
  debounceTime,
  distinctUntilChanged,
  take
} from 'rxjs/operators';

import { Subject, fromEvent, of, forkJoin, Observable, concat, combineLatest } from 'rxjs';

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog
} from '@angular/material';

//////////// i18n ////////////
import {
  TranslateService
} from '@ngx-translate/core';
import { locale as english } from '../../i18n/en';
import { locale as spanish } from '../../i18n/es';
import { FuseTranslationLoaderService } from '../../../../../core/services/translation-loader.service';

//////////// Others ////////////
import { KeycloakService } from 'keycloak-angular';
import { ClientDetailService } from '../client-detail.service';
import { DialogComponent } from '../../dialog/dialog.component';
import { ToolbarService } from '../../../../toolbar/toolbar.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'client-satellite',
  templateUrl: './client-satellite.component.html',
  styleUrls: ['./client-satellite.component.scss']
})
// tslint:disable-next-line:class-name
export class ClientSatelliteComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  @Input('pageType') pageType: string;
  @Input('client') client: any;

  tipTypeList = ['CASH', 'VIRTUAL_WALLET'];
  satelliteTypeList = ['PORTER_LODGE','HOTEL']

  clientSatelliteForm: any;
  clientStateForm: any;

  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private formBuilder: FormBuilder,
    public snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private ClientDetailservice: ClientDetailService,
    private dialog: MatDialog,
    private toolbarService: ToolbarService
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.clientSatelliteForm = new FormGroup({
      referrerDriverDocumentId: new FormControl(this.client ? (this.client.satelliteInfo || {}).referrerDriverDocumentId : ''),
      tip: new FormControl(this.client ? (this.client.satelliteInfo || {}).tip : '', [Validators.required]),
      tipType: new FormControl(this.client ? (this.client.satelliteInfo || {}).tipType : '', [Validators.required]),
      satelliteType: new FormControl(this.client ? (this.client.satelliteInfo || {}).satelliteType : ''),
      offerOnlyVip: new FormControl(this.client ? (this.client.satelliteInfo || {}).offerOnlyVip : ''),
      offerMinDistance: new FormControl(this.client ? (this.client.satelliteInfo || {}).offerMinDistance : ''),
      offerMaxDistance: new FormControl(this.client ? (this.client.satelliteInfo || {}).offerMaxDistance : ''),
      clientAgreements: new FormArray( this.buildClientAgreementArray(this.client) ),
      associatedClients: new FormArray( this.buildAssociatedClientArray(this.client) ),
      associatedClientsToRemove: new FormArray([]),
      referrerDriverDocumentIds: new FormArray( ((this.client.satelliteInfo || {}).referrerDriverDocumentIds || [(this.client ? (this.client.satelliteInfo || {}).referrerDriverDocumentId : '')])
      .filter(d => d !== "")
      .map(r => {
        return new FormGroup({
          document: new FormControl(r)
        })
        //return {document: }
      }) )
    });

  }

  updateClientSatelliteInfo() {
    this.showConfirmationDialog$('CLIENT.UPDATE_MESSAGE', 'CLIENT.UPDATE_TITLE')
      .pipe(
        mergeMap(ok => {
          // console.log(this.clientSatelliteForm.getRawValue().clientAgreements);
          const clientClientSatelliteInput = {
            tip: this.clientSatelliteForm.getRawValue().tip,
            tipType: this.clientSatelliteForm.getRawValue().tipType,
            satelliteType: this.clientSatelliteForm.getRawValue().satelliteType,
            offerOnlyVip: this.clientSatelliteForm.getRawValue().offerOnlyVip,
            referrerDriverDocumentId: this.clientSatelliteForm.getRawValue().referrerDriverDocumentId,
            offerMinDistance: this.clientSatelliteForm.getRawValue().offerMinDistance,
            offerMaxDistance: this.clientSatelliteForm.getRawValue().offerMaxDistance,
            associatedClients: this.clientSatelliteForm.getRawValue().associatedClients
              .map(e => ({
                clientId: e.client.id,
                clientName: e.client.name,
                documentId: e.client.documentId
              }))
            ,
            referrerDriverDocumentIds: (this.clientSatelliteForm.getRawValue().referrerDriverDocumentIds || []).map(d => d.document),
            associatedClientsRemoved: this.clientSatelliteForm.getRawValue().associatedClientsToRemove
              .map(e => ({
                clientId: e.client.id,
                clientName: e.client.name,
                documentId: e.client.documentId
              }))
            ,
            clientAgreements: this.clientSatelliteForm.getRawValue().tipType === 'VIRTUAL_WALLET'
              ? this.clientSatelliteForm.getRawValue().clientAgreements
                .map(e => ({
                  clientId: e.client.id,
                  clientName: e.client.name,
                  documentId: e.client.documentId,
                  tipType: 'VIRTUAL_WALLET',
                  tip: e.tip
                }))
              : []
          };
          return this.ClientDetailservice.updateClientClientSatelliteInfo$(this.client._id, clientClientSatelliteInput);

        }),
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(result => {
        this.showSnackBar('CLIENT.WAIT_OPERATION');
      },
        error => {
          this.showSnackBar('CLIENT.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
      );

  }

  onClientStateChange() {
    this.showConfirmationDialog$('CLIENT.UPDATE_MESSAGE', 'CLIENT.UPDATE_TITLE')
      .pipe(
        mergeMap(ok => {
          return this.ClientDetailservice.updateClientClientState$(this.client._id, this.clientStateForm.getRawValue().state);
        }),
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      ).subscribe(result => {
        this.showSnackBar('CLIENT.WAIT_OPERATION');
      },
        error => {
          this.showSnackBar('CLIENT.ERROR_OPERATION');
          console.log('Error ==> ', error);
        });
  }

  showConfirmationDialog$(dialogMessage, dialogTitle) {
    return this.dialog
      // Opens confirm dialog
      .open(DialogComponent, {
        data: {
          dialogMessage,
          dialogTitle
        }
      })
      .afterClosed()
      .pipe(
        filter(okButton => okButton),
      );
  }

  showSnackBar(message) {
    this.snackBar.open(this.translationLoader.getTranslate().instant(message),
      this.translationLoader.getTranslate().instant('CLIENT.CLOSE'), {
        duration: 6000
      });
  }

  graphQlAlarmsErrorHandler$(response) {
    return of(JSON.parse(JSON.stringify(response)))
      .pipe(
        tap((resp: any) => {
          this.showSnackBarError(resp);

          return resp;
        })
      );
  }

  /**
   * Shows an error snackbar
   * @param response
   */
  showSnackBarError(response) {
    if (response.errors) {

      if (Array.isArray(response.errors)) {
        response.errors.forEach(error => {
          if (Array.isArray(error)) {
            error.forEach(errorDetail => {
              this.showMessageSnackbar('ERRORS.' + errorDetail.message.code);
            });
          } else {
            response.errors.forEach(err => {
              this.showMessageSnackbar('ERRORS.' + err.message.code);
            });
          }
        });
      }
    }
  }


  /**
   * Shows a message snackbar on the bottom of the page
   * @param messageKey Key of the message to i18n
   * @param detailMessageKey Key of the detail message to i18n
   */
  showMessageSnackbar(messageKey, detailMessageKey?) {
    const translationData = [];
    if (messageKey) {
      translationData.push(messageKey);
    }

    if (detailMessageKey) {
      translationData.push(detailMessageKey);
    }

    this.translate.get(translationData)
      .subscribe(data => {
        this.snackBar.open(
          messageKey ? data[messageKey] : '',
          detailMessageKey ? data[detailMessageKey] : '',
          {
            duration: 2000
          }
        );
      });
  }

 

  addAsociatedClient(client?: any, tip?: string) {
    const associatedClients = this.clientSatelliteForm.get('associatedClients') as FormArray;
    associatedClients.push(this.formBuilder.group({
      client: new FormControl(client, [Validators.required, this.checkAssociatedClientList.bind(this)]),
    }));
  }

  addReferrerDriverDocumentId() {
    const referrerDriverDocumentIds = this.clientSatelliteForm.get('referrerDriverDocumentIds') as FormArray;
    referrerDriverDocumentIds.push(this.formBuilder.group({
      document: new FormControl(document, [Validators.required]),
    }));
  }

  addAsociatedDoorMan(client?: any, tip?: string) {
    const clientAgreements = this.clientSatelliteForm.get('clientAgreements') as FormArray;
    clientAgreements.push(this.formBuilder.group({
      client: new FormControl(client, [Validators.required, this.checkDoorManList.bind(this)]),
      // tipType: new FormControl(tipType, [Validators.required]),
      tip: new FormControl(tip, [Validators.required, Validators.min(0)])
    }));
  }

  applySameTipToAsociatedClients(){
    const defaultTip = this.clientSatelliteForm.get('tip').value;
    const clientAgreements = this.clientSatelliteForm.get('clientAgreements') as FormArray;
    clientAgreements.controls.forEach(clientControl => clientControl.patchValue({tip: defaultTip}));

  }

  buildClientAgreementArray(client) {
    if (client && client.satelliteInfo && client.satelliteInfo.clientAgreements) {      
      return client.satelliteInfo.clientAgreements
        .map((clientRef: any) => new FormGroup({
          client: new FormControl({ id: clientRef.clientId, name: clientRef.clientName, documentId: clientRef.documentId }),
          // tipType: new FormControl(clientRef.tipType),
          tip: new FormControl(clientRef.tip)
        }));
    } else {
      return [];
    }
  }

  buildAssociatedClientArray(client) {
    if (client && client.satelliteInfo && client.satelliteInfo.associatedClients) {      
      return client.satelliteInfo.associatedClients
        .map((clientRef: any) => new FormGroup({
          client: new FormControl({ id: clientRef.clientId, name: clientRef.clientName, documentId: clientRef.documentId }),
        }));
    } else {
      return [];
    }
  }

  deleteAsociatedDoorMan(index){
    this.clientSatelliteForm.pristine = false;
    const clientAgreements = this.clientSatelliteForm.get('clientAgreements') as FormArray;
    clientAgreements.removeAt(index);
  }

  deleteReferedDriverDocumentId(index){
    this.clientSatelliteForm.pristine = false;
    const referrerDriverDocumentIdList = this.clientSatelliteForm.get('referrerDriverDocumentIds') as FormArray;
    referrerDriverDocumentIdList.removeAt(index);
  }

  deleteAsociatedClient(index){
    this.clientSatelliteForm.pristine = false;
    const associatedClients = this.clientSatelliteForm.get('associatedClients') as FormArray;
    const associatedClientsToRemove = this.clientSatelliteForm.get('associatedClientsToRemove') as FormArray;
    associatedClientsToRemove.push(this.formBuilder.group({
      client: new FormControl(associatedClients.at(index).value.client, []),
    }));
    associatedClients.removeAt(index);
  }

  linkAsociatedClient(index) {
    const associatedClients = this.clientSatelliteForm.get('associatedClients') as FormArray;
    window.open(
      `https://tpi.nebulae.com.co/emi/client/${associatedClients.at(index).value.client.id}`, "_blank");
  }

  printForm(){
    console.log(this.clientSatelliteForm);
  }

  checkDoorManList(c: FormControl){
    if ( typeof c.value === 'string' || !c.value ){ return { clientSelected: { valid: false } }; }
    const clientAgreements = this.clientSatelliteForm.get('clientAgreements') as FormArray;
    const repeated = clientAgreements.getRawValue().filter((v) => ( v.client && c.value && v.client.id === c.value.id )).length;
    if (repeated > 1){
      return { clientRepeated: { valid: false } };
    }

    if (c.value && !c.value.documentId){
      return { checkDocumentId: { valid: false } };
    }
    return null;
  }

  checkAssociatedClientList(c: FormControl){
    if ( typeof c.value === 'string' || !c.value ){ return { clientSelected: { valid: false } }; }
    const associatedClients = this.clientSatelliteForm.get('associatedClients') as FormArray;
    const repeated = associatedClients.getRawValue().filter((v) => ( v.client && c.value && v.client.id === c.value.id )).length;
    if (repeated > 1){
      return { clientRepeated: { valid: false } };
    }

    return null;
  }

  copySatellitLink(){
    console.log(this.client);
    const element = document.createElement('textarea');
    element.id = 'satellite-link';
    element.style.position = 'fixed';
    element.style.top = '0';
    element.style.left = '0';
    element.style.opacity = '0';
    element.value =  `https://app.txplus.com.co/profile/satellite/${this.client._id}`;
    document.body.appendChild(element);
    element.select();
    document.execCommand('copy');
    document.body.removeChild(document.getElementById('satellite-link'));
  }




  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
