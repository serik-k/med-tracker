export type OrderStatus = 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'HOSPITAL_TRANSPORT' | 'COMPLETED';
export type OrderPriority = 'EMERGENCY' | 'URGENT' | 'STANDARD';

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

export interface AuditLogEntry {
  timestamp: string;
  event: string;
  text: string;
}

export interface Crew {
  id: string;
  name: string;
  carPlate: string;
  type: string;
  driverName: string;
  status: 'ON_DUTY' | 'ON_CALL' | 'BREAK' | 'OFF_DUTY';
}

export interface Order {
  id: string;
  token: string;
  patientPhone: string;
  patientName: string;
  address: string;
  destinationLoc: Location;
  carNumber: string;
  priority?: OrderPriority;
  status: OrderStatus;
  hospitalName?: string;
  currentLoc: Location;
  routePath?: Location[];
  etaMinutes?: number;
  distanceKm?: number;
  accessInfo: AccessInfo;
  symptoms: string[];
  sosAlert?: boolean;
  sosTime?: string;
  isSimulating: boolean;
  createdAt: string;
  completedAt?: string;
  expired: boolean;
  clinicId?: string;
  clinicName?: string;
  auditLogs?: AuditLogEntry[];
}
