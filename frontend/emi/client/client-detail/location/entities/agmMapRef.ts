/// <reference types="googlemaps" />

export class MapRef extends google.maps.Map {

  firstConfig = true;

  constructor(mapDiv: Element|null, opts?: google.maps.MapOptions){
    super(mapDiv, opts);
  }

}
