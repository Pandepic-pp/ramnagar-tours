// Mirrors the backend contract (see ../../backend/CLAUDE.md). Money is whole rupees.

export type Role = 'customer' | 'admin';
export type Me = { userId: string; phone: string; name: string | null; email: string | null; role: Role };

export type TripType = 'oneway' | 'roundtrip';
export type VehicleId = 'sedan' | 'suv' | 'innova' | 'tempo';
export type BookingStatus = 'requested' | 'assigned' | 'completed' | 'cancelled';

export type LocationKind = 'base' | 'wildlife' | 'lake' | 'temple' | 'hill' | 'snow' | 'river' | 'city' | 'gateway';
export type Region = 'Ramnagar & Corbett' | 'Kumaon' | 'Garhwal' | 'Gateways';

export type Place = {
  id: string;
  name: string;
  region: Region;
  kind: LocationKind;
  lat: number;
  lng: number;
  blurb: string;
  popular: boolean;
  fromBase: { distanceKm: number; durationMin: number; startingFare: number } | null;
};

export type VehicleInfo = {
  id: VehicleId;
  name: string;
  models: string;
  seats: number;
  bags: number;
  oneWayPerKm: number;
  roundTripPerKm: number;
};

export type Catalog = {
  baseId: string;
  locations: Place[];
  vehicles: VehicleInfo[];
  rules: {
    gstPercent: number;
    minLeadMinutes: number;
    maxNights: number;
    oneWayMinKm: number;
    outstationMinKmPerDay: number;
    nightPickup: { fromHour: number; toHour: number; charge: number };
    peakSurchargePercent: number;
    peakWindows: string[];
  };
};

export type FareGroup = 'fare' | 'extra' | 'passthrough' | 'tax' | 'adjust';
export type FareLine = { code: string; label: string; detail?: string; amount: number; group: FareGroup | string };

export type Fare = {
  vehicleId: VehicleId;
  vehicleName: string;
  seats: number;
  perKm: number;
  billableKm: number;
  lines: FareLine[];
  total: number;
  fits: boolean;
};

export type TripQuote = {
  pickup: { id: string; name: string };
  destination: { id: string; name: string };
  tripType: TripType;
  distanceKm: number;
  durationMin: number;
  days: number;
  nights: number;
  peak: string | null;
  nightPickup: boolean;
  fares: Fare[];
  notes: string[];
};

export type QuoteRequest = {
  pickupId: string;
  destinationId: string;
  tripType: TripType;
  pickupAt: string; // ISO with +05:30
  returnDate?: string;
  passengers: number;
};

export type CreateBookingRequest = QuoteRequest & {
  vehicle: VehicleId;
  quotedTotal: number;
  name?: string;
  notes?: string;
};

export type Booking = {
  id: string;
  reference: string;
  contactName: string;
  contactPhone: string;
  pickup: string;
  destination: string;
  pickupAt: string;
  passengers: number;
  notes: string | null;
  status: BookingStatus;
  driver: { name: string; phone: string } | null;
  vehicle: { model: string; number: string } | null;
  createdAt: string;
  completedAt: string | null;
  trip: {
    pickupId: string;
    destinationId: string;
    vehicleId: VehicleId;
    tripType: TripType;
    returnDate: string | null;
    distanceKm: number;
    durationMin: number;
    days: number;
  } | null;
  fare: { lines: FareLine[]; total: number } | null;
};

export type AssignInput = { driverName: string; driverPhone: string; vehicleModel: string; vehicleNumber: string };
