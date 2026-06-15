export interface BookingRequest {
  id: string;
  date: string;
  clientName: string;
  phone: string;
  email: string;
  guests: number;
  menuPreference: string;
  estimatedBudget: string;
  message?: string;
  salonName: string;
  extraServices: string[];
}

export interface ConfirmedEvent {
  id: string;
  date: string;
  clientName: string;
  guests: number;
  phone: string;
  email: string;
  pricePerMeniu?: number;
  salonName: string;
  extraServices: string[];
  accessCode?: string;
}
