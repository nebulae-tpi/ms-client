export class PolygonRef{

  clickable: boolean;
  editable: boolean;
  fillColor: string;
  fillOpacity: number;
  geodesic: boolean;
  paths: {lat: number, lng: number} [];
  polyDraggable: boolean;
  strokeColor: string;
  strokeOpacity: number;
  strokeWeight: number;
  visible: boolean;

  constructor(paths){

    this.clickable = true;
    this.editable = true;
    this.fillColor = '#ff0000';
    this.fillOpacity = 0.7;
    this.geodesic = false;
    this.paths = paths;
    this.polyDraggable = true;
    this.strokeColor = '#000000';
    this.strokeOpacity = 1;
    this.strokeWeight = 5;
    this.visible = true;

  }

}
