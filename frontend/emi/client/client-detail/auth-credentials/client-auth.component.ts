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
  FormGroupDirective
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

import { Subject, fromEvent, of, forkJoin, Observable, concat, combineLatest, BehaviorSubject } from 'rxjs';

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
  selector: 'client-auth',
  templateUrl: './client-auth.component.html',
  styleUrls: ['./client-auth.component.scss']
})
// tslint:disable-next-line:class-name
export class ClientAuthComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  @Input('pageType') pageType: string;
  @Input('client') client: any;

  userAuthForm: any;
  private emailMessageSubject = new BehaviorSubject<Boolean>(false);
  showEmailMessage = false;


  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private formBuilder: FormBuilder,
    public snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private ClientDetailservice: ClientDetailService,
    private dialog: MatDialog,
    private toolbarService: ToolbarService,
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.userAuthForm = this.createUserAuthForm();
    this.ClientDetailservice.emailChangeSubject.pipe(
      takeUntil(this.ngUnsubscribe)
    ).subscribe(email => { 
      this.showEmailMessage = email && email !== "";
      this.emailMessageSubject.next(email && email !== "");
    })
  }

    /**
   * Creates the user auth reactive form
   */
  createUserAuthForm() {
    return this.formBuilder.group(
      {
        username: [
        {
          value: this.client.auth ? this.client.auth.username : '',
          disabled: (this.pageType !== 'new' && this.client.auth && this.client.auth.username)
        },
        Validators.compose([
          Validators.required,
          Validators.pattern('^[a-zA-Z0-9._@-]{8,}$')
        ])
      ],
        password: [
          '',
          Validators.compose([
            Validators.required,
            Validators.pattern(
              '^(?=[a-zA-Z0-9.]{8,}$)(?=.*?[a-z])(?=.*?[0-9]).*'
            )
          ])
        ],
        passwordConfirmation: ['', Validators.required],
        temporary: [true, Validators.required]
      },
      {
        validator: this.checkIfMatchingPasswords(
          'password',
          'passwordConfirmation'
        )
      }
    );
  }

  /**
   * Create the client auth on Keycloak
   */
  createClientAuth(formDirective: FormGroupDirective) {
    const data = this.userAuthForm.getRawValue();

    this.makeOperation$(this.ClientDetailservice.createClientAuth$(this.client._id, data))
    .subscribe(
        model => {
          this.showSnackBar('CLIENT.WAIT_OPERATION');
          formDirective.resetForm();
          this.client.auth = {
            username: data.username
          };
          this.userAuthForm.reset();
          this.userAuthForm = this.createUserAuthForm();
        },
        error => {
          this.showSnackBar('CLIENT.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
    );
  }

  /**
   * Remove the user auth
   */
  removeClientAuth() {

    this.makeOperation$(this.ClientDetailservice.removeClientAuth$(this.client._id))
    .subscribe(
        model => {
          this.showSnackBar('CLIENT.WAIT_OPERATION');
          this.client.auth = null;
          this.userAuthForm.reset();
          this.userAuthForm = this.createUserAuthForm();
        },
        error => {
          this.showSnackBar('CLIENT.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
    );
  }

    /**
   * Reset the user password
   */
  resetClientPassword(formDirective: FormGroupDirective) {
    const data = this.userAuthForm.getRawValue();

    this.makeOperation$(this.ClientDetailservice.resetClientPassword$(this.client._id, data))
    .subscribe(
        model => {
          this.showSnackBar('CLIENT.WAIT_OPERATION');
          //this.userAuthForm.reset();
          formDirective.resetForm();
          this.userAuthForm = this.createUserAuthForm();
        },
        error => {
          this.showSnackBar('CLIENT.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
    );
  }

  /**
   * Make observable operations
   */
  makeOperation$(observableOperation) {
    return this.showConfirmationDialog$('CLIENT.UPDATE_MESSAGE', 'CLIENT.UPDATE_TITLE')
    .pipe(
      mergeMap(ok => observableOperation),
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      filter((resp: any) => !resp.errors || resp.errors.length === 0),
      takeUntil(this.ngUnsubscribe)
    );
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

  /**
   * Checks if the passwords match, otherwise the form will be invalid.
   * @param passwordKey new Password
   * @param passwordConfirmationKey Confirmation of the new password
   */
  checkIfMatchingPasswords(
    passwordKey: string,
    passwordConfirmationKey: string
  ) {
    return (group: FormGroup) => {
      const passwordInput = group.controls[passwordKey],
        passwordConfirmationInput = group.controls[passwordConfirmationKey];
      if (passwordInput.value !== passwordConfirmationInput.value) {
        return passwordConfirmationInput.setErrors({ notEquivalent: true });
      } else {
        return passwordConfirmationInput.setErrors(null);
      }
    };
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
