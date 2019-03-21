import { Observable } from 'rxjs/Observable';
import { Component, OnDestroy, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '../../../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { FuseTranslationLoaderService } from '../../../../../../core/services/translation-loader.service';
import { locale as english } from '../../../i18n/en';
import { locale as spanish } from '../../../i18n/es';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { mergeMap, map, tap, filter, mapTo, startWith, debounceTime, distinctUntilChanged, toArray, takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material';
import { runInThisContext } from 'vm';
// tslint:disable-next-line:import-blacklist
import { Subject } from 'rxjs/Rx';
import { ClientDetailService } from '../../client-detail.service';
import { ToolbarService } from '../../../../../toolbar/toolbar.service';

export interface Actor{
  buId: string;
  fromBu: string;
  name: string;
  percentage: number;
}


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'client-autocomplete',
  templateUrl: './client-autocomplete.component.html',
  styleUrls: ['./client-autocomplete.component.scss'],
  animations: fuseAnimations
})

export class ClientAutocompleteComponent implements OnInit, OnDestroy {

  private ngUnsubscribe = new Subject();

  @Input() editable: boolean;
  @Input() formGroup: FormGroup;
  @Input() controlName: string;
  @Input() placeHolder: String;
  @Output() onSelected = new EventEmitter();

  selectedBusinessId: any;


  subscriptions = [];
  currentConf: any;
  clientsQueryFiltered$: Observable<any>;

  formInitialized = false;

  constructor(
    private clientDetailService: ClientDetailService,
    private translationLoader: FuseTranslationLoaderService,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private toolbarService: ToolbarService,
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {

    this.toolbarService.onSelectedBusiness$
    .pipe(
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe(buSelected => {
      this.selectedBusinessId = (buSelected && buSelected.id) ? buSelected.id : null;
    }, err => console.log(err), () => {});

    this.clientsQueryFiltered$ = this.formGroup.get(this.controlName).valueChanges
      .pipe(
        // startWith(this.formGroup.get(this.controlName).value),
        debounceTime(500),
        distinctUntilChanged(),
        filter(input => typeof input === 'string'),
        map((filterText: string) => ({
          filterValue: {
            name: filterText ? filterText.trim().toLowerCase() : '',
            businessId: this.selectedBusinessId
          },
          pagination: { count: 10, page: 0, sort: -1 }
        })),
        mergeMap(({ filterValue, pagination }) => this.getClientsFiltered$(filterValue, pagination))
      );

  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }


  onSelectBusinessEvent(business){
    // this.formGroup.get(this.controlName).setValue(business.id)
    this.onSelected.emit(business);
  }


  getClientsFiltered$(filterInput, pagination): Observable<any[]> {
    return this.clientDetailService.getFilteredClientList$(filterInput, pagination).pipe(
      filter((resp: any) => !resp.errors),
      map((result: any) => result.data.ClientClients),
      map((r: any[]) => r.map((e: any) => ({ name: e.generalInfo.name, id: e._id, documentId: e.generalInfo.documentId })  )),
      takeUntil(this.ngUnsubscribe)
    );
  }

  displayFn(client) {
    return (client) ? `${client.name}-${client.documentId}` : '';
  }
}
