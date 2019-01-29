import { TranslateService } from '@ngx-translate/core';
import { KeycloakService } from 'keycloak-angular';
import { FuseTranslationLoaderService } from '../../../../../core/services/translation-loader.service';
import { Component, OnDestroy, OnInit, ViewChild, Input } from '@angular/core';
import { fuseAnimations } from '../../../../../core/animations';
import { locale as english } from '../../i18n/en';
import { locale as spanish } from '../../i18n/es';
import { Subscription } from 'rxjs/Subscription';
import { DatePipe } from '@angular/common';
import { FormGroup, FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material';
import { MapRef } from './entities/agmMapRef';
// import { MarkerCluster } from './entities/markerCluster';
import { MarkerRef, ClientPoint, MarkerRefOriginalInfoWindowContent } from './entities/markerRef';
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



  // selectedBusiness: { businessName: string, businessId: string, products: string[] };
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
  DEFAULT_LOCATION = { lat: 6.2231197, long: -75.5798886 };

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
    this.isPlatformAdmin = this.keycloakService.getUserRoles(true).includes(this.PLATFORM_ADMIN);
    this.initObservables();

    // concat(
    //   // update the [isPLATFORM-ADMIN] variable
    //   of(this.keycloakService.getUserRoles(true).includes(this.PLATFORM_ADMIN))
    //     .pipe(
    //       tap((isPlatformAdmin) => this.isPlatformAdmin = isPlatformAdmin)
    //     )
    // )
    //   .subscribe(r => { }, err => { }, () => { });
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
  drawMarkerList$(posList: any[]) {
    return posList && posList.length > 0
      ? from(posList)
        .pipe(
          map((p) => new MarkerRef(
            new ClientPoint(p.location),
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

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  initMap() {

    const divStyle = {
      backgroundColor: '#fff',
      border: '2px solid #fff',
      borderRadius: '3px',
      boxShadow: '0 2px 6px rgba(0,0,0,.3)',
      cursor: 'pointer',
      marginBottom: '22px',
      textAlign: 'center',
      marginLeft: '4px'
    };

    const textStyle = {
      color: 'rgb(25,25,25)',
      fontFamily: 'Roboto,Arial,sans-serif',
      fontSize: '16px',
      lineHeight: '38px',
      paddingLeft: '5px',
      paddingRight: '5px'
    };

    of(this.client.location)
      .pipe(
        tap(cl => console.log('UBICACION DEL CLIENTE ACTUAL', cl)),
        map(cl => cl != null ? ({ lat: cl.lat, long: cl.lng }) : this.DEFAULT_LOCATION),
        map(latLng => {
          this.map = new MapRef(this.gmapElement.nativeElement, {
            center: new google.maps.LatLng(latLng.lat, latLng.long),
            zoom: 15,
            streetViewControl: false,
            mapTypeId: google.maps.MapTypeId.ROADMAP
          });

          return latLng;
        }),
        mergeMap((coordinates) => this.drawMarkerList$([{
          location: {
            coordinates: { ...coordinates }
          }
        }])
        )
      )
      .subscribe(o => console.log(o), e => console.log(e), () => console.log('COMPLETED!!! ', this.map));





    const saveControlDiv = document.createElement('div');
    const clearControlDiv = document.createElement('div');

    this.CreategenericControl(saveControlDiv, divStyle,
      this.translationLoader.getTranslate().instant('MAP.CLICK_TO_SAVE'), textStyle,
      this.translationLoader.getTranslate().instant('MAP.SAVE'), this.map, this.saveLocation.bind(this)
    );
    this.CreategenericControl(clearControlDiv, divStyle,
      this.translationLoader.getTranslate().instant('MAP.CLICK_TO_CLEAR'), textStyle,
      this.translationLoader.getTranslate().instant('MAP.CLEAR'), this.map, this.clearLocation.bind(this)
    );

    saveControlDiv['index'] = 1;
    clearControlDiv['index'] = 2;
    this.map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(saveControlDiv);
    this.map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(clearControlDiv);
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

  initObservables(){

    this.subscriptions.push(
      this.translateService.onLangChange
      .pipe(
        map(lang => lang.translations.MARKER.INFOWINDOW),
        map(() => this.initMap())
        // mergeMap(translations => this.updatebuttonLabels$(translations) )
      )
      .subscribe(() => { }, err => console.error(err), () => { })
    );

    this.subscriptions.push(
      this.map.clickEvent
        .pipe(
          filter(() => this.markers.length === 0 ),
          mergeMap(evt => this.drawMarkerList$(
            [{
              location: {
                coordinates: {
                  lat: evt.latLng.lat(),
                  long: evt.latLng.lng()
                }
              }
            }]
          ))
        )
      .subscribe()
    );
  }

  // updatebuttonLabels$(translations){
  //   console.log(this.map.controls[google.maps.ControlPosition.BOTTOM_LEFT]);
  //   this.map.controls[google.maps.ControlPosition.BOTTOM_LEFT].forEach(e => {
  //     console.log('');
  //   });
  //   return of({});
  // }

  // onSelectBusinessEvent(business: any){
  //   this.selectedBusiness = business;
  // }

  // updateMarkerInfoWindowContent$(translations: any) {
  //   return from(this.markers)
  //     .pipe(
  //       tap(),
  //       map((marker) => ({
  //         marker: marker,
  //         infoWindowContent: MarkerRefOriginalInfoWindowContent
  //           .replace('$$POS_DETAILS$$', translations.POS_DETAILS)
  //           .replace('$$POS_ID$$', translations.POS_ID)
  //           // .replace('$$BUSINESS_ID$$', translations.BUSISNESS_ID)
  //           .replace('$$BUSINESS_NAME$$', translations.BUSINESS_NAME)
  //           .replace('$$USER_NAME$$', translations.USER_NAME)
  //           .replace('$$LAST_UPDATE$$', translations.LAST_UPDATE)
  //           // .replace('{LAST_UPDATE}', this.datePipe.transform(new Date(marker.posPoint.lastUpdate), 'dd-MM-yyyy HH:mm'))
  //       })),
  //       map(({ marker, infoWindowContent }) => marker.infoWindow.setContent(infoWindowContent))
  //     );
  // }

  clearLocation(){
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
  }

  saveLocation(){
    return of(this.markers)
    .pipe(
      map(() => (this.markers && this.markers[0]) ? this.markers[0] : null  ),
      tap(r => console.log('MARCADOR QUE PASA', r) ),
      map((marker: MarkerRef | any)  =>  marker != null ? ({ lat: marker.getPosition().lat(), lng: marker.getPosition().lng() }) : null),

      mergeMap( coordinates => this.clientDetailService.updateClientLocation$(this.client._id, coordinates ) )

    )
    .subscribe();
  }

  CreategenericControl(controlDiv, divStyle: any, divTitle: string, textStyle: any, textTitle: string, mapRef: MapRef, callback) {

    const controlUI = document.createElement('div');
    controlUI.title = divTitle;

    const controlText = document.createElement('div');
    controlText.innerHTML = textTitle;

    // Set CSS for the control border.
    Object.keys(divStyle).forEach(attribute => controlUI.style[attribute] = divStyle[attribute]);
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior.
    Object.keys(textStyle).forEach(attribute => controlText.style[attribute] = textStyle[attribute]);
    controlUI.appendChild(controlText);

    // Setup the click event listeners: simply set the map to Chicago.
    controlUI.addEventListener('click', () => callback());
  }




}
