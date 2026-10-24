export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

export interface EventResponse {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string;
  capacity: number;
  price: number;
  status: EventStatus;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}
