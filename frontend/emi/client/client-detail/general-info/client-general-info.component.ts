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
  selector: 'client-general-info',
  templateUrl: './client-general-info.component.html',
  styleUrls: ['./client-general-info.component.scss']
})
// tslint:disable-next-line:class-name
export class ClientDetailGeneralInfoComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  @Input('pageType') pageType: string;
  @Input('client') client: any;

  clientGeneralInfoForm: any;
  clientStateForm: any;
  addressField: any;

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
    this.clientGeneralInfoForm = new FormGroup({
      name: new FormControl(this.client ? (this.client.generalInfo || {}).name : '', [Validators.required]),
      documentId: new FormControl(this.client ? (this.client.generalInfo || {}).documentId : ''),
      phone: new FormControl(this.client ? (this.client.generalInfo || {}).phone : '', [Validators.max(999999999999999)]),
      email: new FormControl(this.client ? (this.client.generalInfo || {}).email : ''),
      addressLine1: new FormControl(this.client ? (this.client.generalInfo || {}).addressLine1 : ''),
      addressLine2: new FormControl(this.client ? (this.client.generalInfo || {}).addressLine2 : ''),
      city: new FormControl(this.client ? (this.client.generalInfo || {}).city : ''),
      neighborhood: new FormControl(this.client ? (this.client.generalInfo || {}).neighborhood : ''),
      zone: new FormControl(this.client ? (this.client.generalInfo || {}).zone : ''),
      notes: new FormControl(this.client ? (this.client.generalInfo || {}).notes : ''),
    });
    this.addressField = this.client ? (this.client.generalInfo || {}).addressLine1 : '';

    this.clientStateForm = new FormGroup({
      state: new FormControl(this.client ? this.client.state : true)
    });
  }

  onNameChange(newValue) {
    //this.addressField = newValue;
  }
  onEmailChange(newValue) {
    this.ClientDetailservice.emailChangeSubject.next(newValue);
  }

  
  createClient() {
    this.toolbarService.onSelectedBusiness$
    .pipe(
      tap(selectedBusiness => {
        if(selectedBusiness == null || selectedBusiness.id == null) {
          this.showSnackBar('CLIENT.SELECT_BUSINESS');
        }
      }),
      take(1),
      filter(selectedBusiness => selectedBusiness != null && selectedBusiness.id != null),
      mergeMap(selectedBusiness => {
        return this.showConfirmationDialog$("CLIENT.CREATE_MESSAGE", "CLIENT.CREATE_TITLE")
          .pipe(
            map(() => this.clientGeneralInfoForm.getRawValue()),
          map(generalInfoRawValue => ({
            ...generalInfoRawValue,
            phone: parseInt(generalInfoRawValue.phone),
            name: generalInfoRawValue.name.toUpperCase(),
            email: generalInfoRawValue.email.toLowerCase()
          })),
          mergeMap(generalInfoData => {
            this.client = {
              generalInfo: generalInfoData,
              state: this.clientStateForm.getRawValue().state,
              businessId: selectedBusiness.id
            };
            return this.ClientDetailservice.createClientClient$(this.client);
          }),
          mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
          filter((resp: any) => !resp.errors || resp.errors.length === 0),
        )
      }),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(result => {
        this.showSnackBar('CLIENT.WAIT_OPERATION');
      },
        error => {
          this.showSnackBar('CLIENT.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
    );
  }

  updateClientGeneralInfo() {
    this.showConfirmationDialog$("CLIENT.UPDATE_MESSAGE", "CLIENT.UPDATE_TITLE")
      .pipe(
        mergeMap(ok => {
          const generalInfoinput = {
            name: this.clientGeneralInfoForm.getRawValue().name.toUpperCase(),
            documentId: this.clientGeneralInfoForm.getRawValue().documentId,
            phone: parseInt(this.clientGeneralInfoForm.getRawValue().phone),
            addressLine1: this.clientGeneralInfoForm.getRawValue().addressLine1,
            addressLine2: this.clientGeneralInfoForm.getRawValue().addressLine2,
            city: this.clientGeneralInfoForm.getRawValue().city,
            neighborhood: this.clientGeneralInfoForm.getRawValue().neighborhood,
            zone: this.clientGeneralInfoForm.getRawValue().zone,
            email: this.clientGeneralInfoForm.getRawValue().email.toLowerCase(),
            notes: this.clientGeneralInfoForm.getRawValue().notes,
          };
          return this.ClientDetailservice.updateClientClientGeneralInfo$(this.client._id, generalInfoinput);
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
    if (this.pageType === 'new') {
      return;
    }
    this.showConfirmationDialog$("CLIENT.UPDATE_MESSAGE", "CLIENT.UPDATE_TITLE")
      .pipe(
        mergeMap(ok => this.ClientDetailservice.updateClientClientState$(this.client._id, this.clientStateForm.getRawValue().state)),
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
   * Shows a message snackbar on the bottom of the page.
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
