// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';

export class CircleRef {
   circleDraggable: boolean;
   clickable: boolean;
   editable: boolean;
   fillColor: string;
   fillOpacity: number;
   latitude: number;
   longitude: number;
   radius: number;
   strokeColor: string;
   strokeOpacity: number;
   strokePosition: number;
   strokeWeight: number;
   visible: boolean;

  constructor(
    lat: number,
    lng: number,
    radius: number
  ) {
    this.latitude = lat;
    this.longitude = lng;
    this.radius = radius;
    this.circleDraggable = false;
    this.clickable = false;
    this.editable = false;
    this.fillColor = '#ff4d4d';
    this.fillOpacity =  0.5;
    this.strokeColor = '#000000';
    this.strokeOpacity = 1;
    this.visible = true;
  }
}
