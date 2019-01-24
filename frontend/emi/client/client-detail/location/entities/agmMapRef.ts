/// <reference types="googlemaps" />

import { Subject } from 'rxjs';

export class MapRef extends google.maps.Map {

  clickEvent = new Subject<google.maps.MouseEvent>();

  firstConfig = true;

  constructor(mapDiv: Element|null, opts?: google.maps.MapOptions){
    super(mapDiv, opts);
    this.addListener('click', (evt) => this.clickEvent.next(evt) );
  }

}
