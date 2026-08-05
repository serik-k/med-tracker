export type OrderStatus = 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'HOSPITAL_TRANSPORT' | 'COMPLETED' | 'CANCELLED';
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
  clinicContactPhone?: string;
  hospitalOptions?: HospitalOption[];
  clinicHospitals?: HospitalOption[];
}

export interface AssignedCrew {
  id: string;
  name: string;
  carPlate: string;
  type?: string;
  driverName?: string;
  status?: Crew['status'];
}

export interface HospitalOption {
  id?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  location: Location;
}

export interface Order {
  id: string;
  token: string;
  patientPhone: string;
  patientName: string;
  address: string;
  destinationLoc: Location | null;
  crewId: string | null;
  assignedCrew?: AssignedCrew | null;
  carNumber: string;
  priority?: OrderPriority;
  status: OrderStatus;
  hospitalName?: string;
  hospitalLocation?: Location | null;
  currentLoc: Location | null;
  routePath?: Location[];
  etaMinutes?: number | null;
  distanceKm?: number | null;
  accessInfo: AccessInfo;
  symptoms: string[];
  isSimulating: boolean;
  createdAt: string;
  updatedAt?: string;
  locationUpdatedAt?: string | null;
  etaUpdatedAt?: string | null;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  expired: boolean;
  clinicId?: string;
  clinicName?: string;
  clinicContactPhone?: string;
  patientAccessScope?: 'patient' | 'viewer';
  hospitalOptions?: HospitalOption[];
  clinicHospitals?: HospitalOption[];
  auditLogs?: AuditLogEntry[];
}

export interface PatientAccessLink {
  patientAccessToken: string;
  patientAccessPath: string;
  patientAccessExpiresAt?: string;
}

export interface CreatedOrder extends Order, Partial<PatientAccessLink> {}
