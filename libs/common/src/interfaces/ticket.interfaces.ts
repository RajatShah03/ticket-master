export type TicketStatus =
  'AVAILABLE' | 'RESERVED' | 'CHECKED_IN' | 'CANCELLED' | 'CONFIRMED';

export interface TicketSummary {
  id: string;
  ticketCode: string;
  eventTitle: string;
  quantity: number;
  totalPrice: number;
  status: TicketStatus;
  purchasedAt: string;
}

export interface TicketDetails extends TicketSummary {
  checkedInAt: string | null;
  userId: string;
  eventId: string;
  eventDate: string;
  eventLocation: string;
}

export interface TicketResponse {
  id: string;
  eventId: string;
  userId: string;
  quantity: number;
  totalPrice: number;
  status: TicketStatus;
  ticketCode: string;
  purchasedAt: string;
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseTicketResponse {
  message: string;
  ticket: TicketSummary;
}

export interface CheckInTicketResponse {
  message: string;
  ticket: Pick<
    TicketResponse,
    'id' | 'ticketCode' | 'quantity' | 'status' | 'checkedInAt'
  >;
}

export interface TicketActionResponse {
  message: string;
}
