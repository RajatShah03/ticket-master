import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';

@Injectable()
export class NotificationsServiceService {
  private readonly logger = new Logger(NotificationsServiceService.name);

  constructor(private readonly emailService: EmailService) {}

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entities[character];
    });
  }

  async sendWelcomeEmail(data: {
    userId: string;
    name: string;
    email: string;
  }) {
    this.logger.log(`Sending welcome email to ${data.email}`);

    const html = `
      <div style="margin:0;padding:32px 16px;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#243244;">
        <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border:1px solid #e5e9ef;border-radius:12px;overflow:hidden;">
          <div style="padding:24px 32px;background-color:#182b49;color:#ffffff;">
            <p style="margin:0;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#b9c9e3;">Ticket-Master</p>
            <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;">Welcome aboard, ${this.escapeHtml(data.name)}!</h1>
          </div>
          <div style="padding:28px 32px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Your account is ready. You can now discover events and keep your tickets all in one place.</p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#68778a;">Thanks for joining us. We hope you find something memorable.</p>
          </div>
        </div>
      </div>
    `;

    await this.emailService.sendEmail(
      data.email,
      'Welcome to Ticket-Master',
      html,
    );
  }

  async sendTicketPurchasedEmail(data: {
    userId: string;
    email: string;
    ticketCode: string;
    eventTitle?: string;
    eventDate?: string;
    eventLocation?: string;
    quantity: number;
    totalPrice: number;
  }) {
    this.logger.log(`Sending ticket confirmation email to ${data.email}`);

    const html = `
      <div style="margin:0;padding:32px 16px;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#243244;">
        <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border:1px solid #e5e9ef;border-radius:12px;overflow:hidden;">
          <div style="padding:24px 32px;background-color:#182b49;color:#ffffff;">
            <p style="margin:0;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#b9c9e3;">Ticket-Master</p>
            <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;">Your tickets are confirmed</h1>
          </div>
          <div style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Thanks for your purchase${data.eventTitle ? ` for <strong>${this.escapeHtml(data.eventTitle)}</strong>` : ''}. Here are your booking details:</p>
            <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
              <tbody>
                ${data.eventDate ? `<tr><td style="padding:10px 0;border-bottom:1px solid #edf0f4;color:#68778a;">Date</td><td style="padding:10px 0;border-bottom:1px solid #edf0f4;text-align:right;">${this.escapeHtml(data.eventDate)}</td></tr>` : ''}
                ${data.eventLocation ? `<tr><td style="padding:10px 0;border-bottom:1px solid #edf0f4;color:#68778a;">Location</td><td style="padding:10px 0;border-bottom:1px solid #edf0f4;text-align:right;">${this.escapeHtml(data.eventLocation)}</td></tr>` : ''}
                <tr><td style="padding:10px 0;border-bottom:1px solid #edf0f4;color:#68778a;">Quantity</td><td style="padding:10px 0;border-bottom:1px solid #edf0f4;text-align:right;">${data.quantity} ${data.quantity === 1 ? 'ticket' : 'tickets'}</td></tr>
                <tr><td style="padding:10px 0;color:#68778a;">Total</td><td style="padding:10px 0;text-align:right;font-weight:bold;">${data.totalPrice.toFixed(2)}</td></tr>
              </tbody>
            </table>
            <div style="margin-top:22px;padding:16px;background-color:#f4f7fb;border-radius:8px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#68778a;">YOUR TICKET CODE</p>
              <p style="margin:0;font-size:20px;font-weight:bold;letter-spacing:2px;color:#182b49;">${this.escapeHtml(data.ticketCode)}</p>
            </div>
            <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#68778a;">Keep this email handy and present your ticket code at the event.</p>
          </div>
        </div>
      </div>
    `;

    await this.emailService.sendEmail(
      data.email,
      'Booking Confirmation!',
      html,
    );
  }

  async sendTicketCancelEmail(data: {
    eventId: string;
    eventTitle?: string;
    eventDate?: string;
    email: string;
  }) {
    this.logger.log(`Sending ticket cancellation email to ${data.email}`);

    const html = `
      <div style="margin:0;padding:32px 16px;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#243244;">
        <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border:1px solid #e5e9ef;border-radius:12px;overflow:hidden;">
          <div style="padding:24px 32px;background-color:#182b49;color:#ffffff;">
            <p style="margin:0;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#b9c9e3;">Ticket-Master</p>
            <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;">Ticket cancellation notice</h1>
          </div>
          <div style="padding:28px 32px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">We're sorry to let you know that your ticket${data.eventTitle ? ` for <strong>${this.escapeHtml(data.eventTitle)}</strong>` : ''} has been cancelled.</p>
            ${data.eventDate ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#68778a;">Event date: ${this.escapeHtml(data.eventDate)}</p>` : ''}
            <p style="margin:0;font-size:14px;line-height:1.6;color:#68778a;">If you have questions about this cancellation, please contact the event organizer.</p>
          </div>
        </div>
      </div>
    `;

    await this.emailService.sendEmail(data.email, 'Ticket Cancellation!', html);
  }
}
