export type OrderStatus = 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'HOSPITAL_TRANSPORT' | 'COMPLETED';

export interface Location {
  lat: number;
  lng: number;
}

export interface AccessInfo {
  residenceType?: 'apartment' | 'house';
  intercom: string;
  gateCode: string;
  entrance: string;
  floor: string;
  note: string;
  photoUrl?: string;
}

export interface Order {
  id: string;
  token: string;
  patientPhone: string;
  patientName: string;
  address: string;
  destinationLoc: Location;
  carNumber: string;
  status: OrderStatus;
  currentLoc: Location;
  routePath?: Location[];
  etaMinutes?: number;
  distanceKm?: number;
  accessInfo: AccessInfo;
  symptoms: string[];
  isSimulating: boolean;
  createdAt: string;
  completedAt?: string;
  expired: boolean;
}
