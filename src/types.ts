export type CourseKey = 'felul1' | 'felul2' | 'felul3' | 'felul4';

export interface SeatingTableLayout {
  id: string;
  name: string;
  x: number; // 0–100 percentage of canvas width
  y: number; // 0–100 percentage of canvas height
  shape: 'round' | 'rectangular';
  seats: number;
  guests: string[];
}

export interface MenuOption {
  id: string;
  course: CourseKey;
  title: string;
  description?: string;
  pricePerPerson?: number;
}

export interface MenuData {
  felul1: string;
  felul2: string;
  felul3: string;
  felul4: string;
}

export interface ScheduleItem {
  id: string;
  ora: string;
  descriere: string;
}

export interface MesaItem {
  id: string;
  masa: string;
  invitati: string[];
}

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
  menuData?: MenuData;
  scheduleData?: ScheduleItem[];
  tablesData?: MesaItem[];
  seatingLayout?: SeatingTableLayout[];
}
