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
  Validators
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
import { ToolbarService } from "../../../../toolbar/toolbar.service";

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
      offerMinDistance: new FormControl(this.client ? (this.client.satelliteInfo || {}).offerMinDistance : ''),
      offerMaxDistance: new FormControl(this.client ? (this.client.satelliteInfo || {}).offerMaxDistance : ''),
    });

  }

  updateClientSatelliteInfo() {
    this.showConfirmationDialog$("CLIENT.UPDATE_MESSAGE", "CLIENT.UPDATE_TITLE")
      .pipe(
        mergeMap(ok => {
          const clientClientSatelliteInput = {
            tip: this.clientSatelliteForm.getRawValue().tip,
            tipType: this.clientSatelliteForm.getRawValue().tipType,
            referrerDriverDocumentId: this.clientSatelliteForm.getRawValue().referrerDriverDocumentId,
            offerMinDistance: this.clientSatelliteForm.getRawValue().offerMinDistance,
            offerMaxDistance: this.clientSatelliteForm.getRawValue().offerMaxDistance,
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
    this.showConfirmationDialog$("CLIENT.UPDATE_MESSAGE", "CLIENT.UPDATE_TITLE")
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
      //Opens confirm dialog
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
            response.errors.forEach(error => {
              this.showMessageSnackbar('ERRORS.' + error.message.code);
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
    let translationData = [];
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



  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}