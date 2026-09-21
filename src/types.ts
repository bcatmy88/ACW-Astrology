export interface SavedClient {
  id: string;
  name: string;
  phone: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  gender: 'male' | 'female';
  notes?: string;
  createdAt: any;
}

export type CaseStatus = 'Reviewing' | 'Executing' | 'Settled' | 'Canceled';
export type AppLanguage = 'zh' | 'en';

export type AppointmentStatus = 'Pending' | 'Completed' | 'Canceled';

export interface AppointmentItem {
  id: string;
  clientName: string;
  clientPhone?: string;
  clientId?: string; // Associated client ID from savedClients if any
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "14:30"
  services: string[]; // List of services requested, e.g. ["问事批命", "补财库"]
  notes: string; // What they want to do / detailed items
  status: AppointmentStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CaseItem {
  id: string;
  title: string;
  clientId: string; // Associated client ID from savedClients
  description: string;
  status: CaseStatus;
  createdAt: number;
  updatedAt: number;
}

export interface NoteItem {
  id: string;
  title: string;
  date: string;
  content: string;
  images: string[]; // Base64 data URLs
  createdAt: number;
  updatedAt: number;
  clientId?: string;
  keywords?: string[]; // Multiple keyword category tags (e.g. ["八字命理", "风水", "客户问事"])
}

export interface BackupData {
  version: string;
  exportedAt: string;
  clients: SavedClient[];
  mainUserId: string | null;
  cases: CaseItem[];
  notes: NoteItem[];
  appointments?: AppointmentItem[];
}
