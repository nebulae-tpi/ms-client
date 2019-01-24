export interface CoverageItem {
  _id: string;
  lastUpdated: number;
  businessId: string;
  products: string[];
  avgReloads: number;
  pos: { userName: string, userId: string, terminal: any };
  location: { type: string, coordinates: number[] };
}
