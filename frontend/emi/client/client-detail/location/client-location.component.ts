import { TranslateService } from '@ngx-translate/core';
import { KeycloakService } from 'keycloak-angular';
import { FuseTranslationLoaderService } from '../../../../../core/services/translation-loader.service';
import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation, Input } from '@angular/core';
import { fuseAnimations } from '../../../../../core/animations';
import { locale as english } from '../../i18n/en';
import { locale as spanish } from '../../i18n/es';
import { Subscription } from 'rxjs/Subscription';
import { DatePipe } from '@angular/common';
import { FormGroup, FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material';
import { MapRef } from './entities/agmMapRef';
// import { MarkerCluster } from './entities/markerCluster';
import { MarkerRef, PosPoint, MarkerRefOriginalInfoWindowContent } from './entities/markerRef';
import { of, concat, from, forkJoin, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, tap, map, mergeMap, toArray, filter, mapTo, defaultIfEmpty } from 'rxjs/operators';
import { ClientDetailService } from '../client-detail.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'client-location',
  templateUrl: './client-location.component.html',
  styleUrls: ['./client-location.component.scss'],
  animations: fuseAnimations,
})
export class ClientLocationComponent implements OnInit, OnDestroy {
  isPlatformAdmin = false;
  filterForm: FormGroup = new FormGroup({
    businessId: new FormControl(),
    product: new FormControl(),
    posId: new FormControl()
  });

  @ViewChild('gmap') gmapElement: any;
  @Input('client') client: any;

  selectedBusiness: { businessName: string, businessId: string, products: string[] };
  businessQueryFiltered$: Observable<any[]>;

  mapTypes = [
    google.maps.MapTypeId.HYBRID,
    google.maps.MapTypeId.ROADMAP,
    google.maps.MapTypeId.SATELLITE,
    google.maps.MapTypeId.TERRAIN
  ];

  map: MapRef;
  bounds: google.maps.LatLngBounds;
  // markerClusterer: MarkerCluster;
  markers: MarkerRef[] = [];
  selectedMarker: MarkerRef;

  businessVsProducts: any[];
  PLATFORM_ADMIN = 'PLATFORM-ADMIN';
  productOpstions: string[];
  subscriptions: Subscription[] = [];

  constructor(
    private clientDetailService: ClientDetailService,
    private translationLoader: FuseTranslationLoaderService,
    public snackBar: MatSnackBar,
    private keycloakService: KeycloakService,
    private translateService: TranslateService,
    private datePipe: DatePipe
    ) {
      this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {

    this.initMap(); // initialize the map element
  //   this.isPlatformAdmin = this.keycloakService.getUserRoles(true).includes(this.PLATFORM_ADMIN);
  //   this.initObservables();

  // concat(
  //   // update the [isPLATFORM-ADMIN] variable
  //   of(this.keycloakService.getUserRoles(true).includes(this.PLATFORM_ADMIN))
  //   .pipe(
  //     tap((isPlatformAdmin) => this.isPlatformAdmin = isPlatformAdmin )
  //   )

  // )
  // .subscribe(r => {}, err => {}, () => {});
  }

   /**
   * Adjusts the zoom according to the markers
   */
  adjustZoomAccordingToTheMarkers$(){
    return of(new google.maps.LatLngBounds())
      .pipe(
        map(bounds => this.bounds = bounds),
        mergeMap(() => from(this.markers)
          .pipe(
            map(marker => new google.maps.LatLng(marker.getPosition().lat(), marker.getPosition().lng())),
            tap(coordinates => this.bounds.extend(coordinates)),
            toArray()
          )
        ),
        map(() => {
          this.map.fitBounds(this.bounds);
          this.map.panToBounds(this.bounds);
        })
      );

  }

  /**
   * Creates the MarkerRef object and push it to the map and the markers array
   * @param posList List with all Pos items to draw in the map
   */
  drawPosList$(posList: any[]) {
    return posList && posList.length > 0
      ? from(posList)
        .pipe(
          tap(i => console.log('ITERANDO LOS ELEMENTOS DE drawPosList', i)),
          map((p) => new MarkerRef(
            new PosPoint(p._id, p.lastUpdate, p.businessId, p.businessName, p.products, p.pos, p.location),
            {
              position: {
                lat: parseFloat(p.location.coordinates.lat),
                lng: parseFloat(p.location.coordinates.long)
              }, map: null
            }
          )),
          tap(marker => marker.setMap(this.map)),
          tap(marker => this.addMarkerToMap(marker)),
          toArray()
        )
      : of(null);
  }

  clearMap$(){
    return from(this.markers)
    .pipe(
      filter(() => this.markers.length > 0),
      map(marker => marker.setMap(null)),
      toArray(),
      map(() => this.markers = [])
    );
  }

  /**
   * Update markert clusterer, removing the markers in the cluster and then pushing the new posItems int he markers array
   */
  // updateMarkerClusterer$() {
  //   return of(this.markerClusterer)
  //     .pipe(
  //       // clear the cluster markers
  //       map(markerCluster => {
  //         if (markerCluster){
  //           this.markerClusterer.clearMarkers();
  //           console.log('SE HA LIPIADO EL CLUSTERER');
  //         }
  //         return null;
  //       }),
  //       filter(() => (this.markers && this.markers.length > 0)),
  //       map(() => {
  //         console.log('SE VAN A INSERTAR LOS MARCADORES => ', this.markers);
  //         this.markerClusterer = new MarkerCluster(this.map, this.markers,
  //           { imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m' });
  //         return true;
  //       })

  //     );
  // }


  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  initMap() {
    this.map = new MapRef(this.gmapElement.nativeElement, {
      center: new google.maps.LatLng(6.1701312, -75.6058417),
      zoom: 14,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
  }

   /**
   * Adds a marker to the map and configure observables to listen to the events associated with the marker (Click, etc)
   * @param marker marker to be added
   */
  addMarkerToMap(marker: MarkerRef) {
    marker.inizialiteEvents();

    marker.clickEvent.subscribe(event => {
      this.onMarkerClick(marker, event);
    });

    this.markers.push(marker);
  }

  /**
   * Opens the infoWindow of the clicked marker and closes the other infoWindows in case that these were open.
   * @param marker clicked marker
   * @param event Event
   */
  onMarkerClick(marker: MarkerRef, event) {
    this.selectedMarker = marker;
    this.markers.forEach(m => {
      m.infoWindow.close();
      m.setAnimation(null);
    });
    marker.setAnimation(google.maps.Animation.BOUNCE);
    marker.setAnimation(null);
    marker.infoWindow.open(this.map, marker);
  }

  onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

  updateAvailableProducts(businessId) {
    (businessId && businessId !== 'null')
      ? this.businessVsProducts = this.businessVsProducts.find(e => businessId === businessId).products
      : this.businessVsProducts = this.businessVsProducts.reduce((acc, item) => { acc.push(...item.products); return acc; }, []);
  }

  initObservables(){

    this.subscriptions.push(
      this.filterForm.get('businessId').valueChanges
        .pipe(
          tap(newSelectedBusinessId => {
            this.productOpstions =
              (this.isPlatformAdmin && newSelectedBusinessId === 'null')
                ? this.businessVsProducts.reduce((acc, item) => [...acc, ...item.products], [])
                : this.businessVsProducts.find(e => e.businessId === newSelectedBusinessId).products;
            this.productOpstions = this.productOpstions.filter(this.onlyUnique);
            if (!this.productOpstions.includes(this.filterForm.get('product').value)) {
              this.filterForm.get('product').setValue(null);
            }
            this.filterForm.get('posId').setValue(null);
          })
        )
        .subscribe(r => { }, error => console.error(), () => { })
    );

    this.subscriptions.push(
      this.filterForm.get('businessId').valueChanges
        .pipe(
          startWith(null),
          tap(buId => this.updateAvailableProducts(buId)),
          tap(result => this.businessVsProducts = result)
        )
        .subscribe(() => { }, err => { }, () => { })
    );

    this.subscriptions.push(
      // listen the filter changes ...
      this.filterForm.valueChanges
        .pipe(
          debounceTime(500),
          distinctUntilChanged(),
          startWith({
            businessId: null,
            product: null,
            posId: null
          }),
          map(filters => filters.businessId === 'null' ? { ...filters, businessId: null } : { ...filters }),
          // mergeMap(filters => this.clientDetailService.getPosItems$(filters.businessId, filters.product, filters.posId)),
          map(r => JSON.parse(JSON.stringify(r))),
          mergeMap(posList => this.clearMap$().pipe(mapTo(posList))),
          mergeMap(posList => this.drawPosList$(posList)),
          // mergeMap(() => this.updateMarkerClusterer$()),
          mergeMap(() => forkJoin(
            this.adjustZoomAccordingToTheMarkers$(),
            of(this.translateService.currentLang)
            .pipe(
              map(language => this.translateService.translations[language].MARKER.INFOWINDOW ),
              mergeMap( translations => this.updateMarkerInfoWindowContent$(translations) )
            )

          ))
        )
        .subscribe(() => { }, err => console.error(err), () => { })
    );

    this.subscriptions.push(
      this.translateService.onLangChange
      .pipe(
        map(lang => lang.translations.MARKER.INFOWINDOW),
        mergeMap(translations => this.updateMarkerInfoWindowContent$(translations) )
      )
      .subscribe(() => { }, err => console.error(err), () => { })
    );
  }

  // onSelectBusinessEvent(business: any){
  //   this.selectedBusiness = business;
  // }

  updateMarkerInfoWindowContent$(translations: any) {
    return from(this.markers)
      .pipe(
        tap(),
        map((marker) => ({
          marker: marker,
          infoWindowContent: MarkerRefOriginalInfoWindowContent
            .replace('$$POS_DETAILS$$', translations.POS_DETAILS)
            .replace('$$POS_ID$$', translations.POS_ID)
            // .replace('$$BUSINESS_ID$$', translations.BUSISNESS_ID)
            .replace('$$BUSINESS_NAME$$', translations.BUSINESS_NAME)
            .replace('$$USER_NAME$$', translations.USER_NAME)
            .replace('$$LAST_UPDATE$$', translations.LAST_UPDATE)
            .replace('{POS_ID}', marker.posPoint._id)
            // .replace('{BUSINESS_ID}', marker.posPoint.businessId)
            .replace('{BUSINESS_NAME}', marker.posPoint.businessName)
            .replace('{USER_NAME}', marker.posPoint.pos.userName)
            .replace('{LAST_UPDATE}', this.datePipe.transform(new Date(marker.posPoint.lastUpdate), 'dd-MM-yyyy HH:mm'))
        })),
        map(({ marker, infoWindowContent }) => marker.infoWindow.setContent(infoWindowContent))
      );
  }


}
