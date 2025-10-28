import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SubscriptionEmailData {
  customerName: string;
  productName: string;
  variantName: string;
  quantity: number;
  frequency: string;
  nextDeliveryDate: string;
  totalPrice: number;
  deliveryAddress?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"Pureborn" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  // Subscription reminder email
  async sendSubscriptionReminder(data: SubscriptionEmailData): Promise<boolean> {
    const html = this.getSubscriptionReminderTemplate(data);
    const text = this.getSubscriptionReminderText(data);

    return this.sendEmail({
      to: data.customerName, // This should be the email address
      subject: `🔄 Your Pureborn subscription delivery is coming up!`,
      html,
      text
    });
  }

  // Subscription created confirmation
  async sendSubscriptionConfirmation(data: SubscriptionEmailData): Promise<boolean> {
    const html = this.getSubscriptionConfirmationTemplate(data);
    const text = this.getSubscriptionConfirmationText(data);

    return this.sendEmail({
      to: data.customerName, // This should be the email address
      subject: `✅ Your Pureborn subscription is now active!`,
      html,
      text
    });
  }

  // Subscription paused notification
  async sendSubscriptionPaused(data: SubscriptionEmailData): Promise<boolean> {
    const html = this.getSubscriptionPausedTemplate(data);
    const text = this.getSubscriptionPausedText(data);

    return this.sendEmail({
      to: data.customerName, // This should be the email address
      subject: `⏸️ Your Pureborn subscription has been paused`,
      html,
      text
    });
  }

  // Subscription resumed notification
  async sendSubscriptionResumed(data: SubscriptionEmailData): Promise<boolean> {
    const html = this.getSubscriptionResumedTemplate(data);
    const text = this.getSubscriptionResumedText(data);

    return this.sendEmail({
      to: data.customerName, // This should be the email address
      subject: `▶️ Your Pureborn subscription has been resumed`,
      html,
      text
    });
  }

  // Subscription cancelled notification
  async sendSubscriptionCancelled(data: SubscriptionEmailData): Promise<boolean> {
    const html = this.getSubscriptionCancelledTemplate(data);
    const text = this.getSubscriptionCancelledText(data);

    return this.sendEmail({
      to: data.customerName, // This should be the email address
      subject: `❌ Your Pureborn subscription has been cancelled`,
      html,
      text
    });
  }

  // Delivery confirmation
  async sendDeliveryConfirmation(data: SubscriptionEmailData & { trackingNumber?: string }): Promise<boolean> {
    const html = this.getDeliveryConfirmationTemplate(data);
    const text = this.getDeliveryConfirmationText(data);

    return this.sendEmail({
      to: data.customerName, // This should be the email address
      subject: `🚚 Your Pureborn order has been delivered!`,
      html,
      text
    });
  }

  // Premium email templates
  private getSubscriptionReminderTemplate(data: SubscriptionEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Reminder - Pureborn</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #1a1a2e, #16213e); }
          .container { max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border-radius: 20px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px 30px; text-align: center; }
          .logo { font-size: 2.5rem; font-weight: bold; color: white; margin-bottom: 10px; }
          .tagline { color: rgba(255, 255, 255, 0.9); font-size: 1.1rem; }
          .content { padding: 40px 30px; }
          .greeting { color: white; font-size: 1.3rem; margin-bottom: 20px; }
          .message { color: rgba(255, 255, 255, 0.8); font-size: 1rem; line-height: 1.6; margin-bottom: 30px; }
          .subscription-card { background: rgba(255, 255, 255, 0.1); border-radius: 15px; padding: 25px; margin: 20px 0; border: 1px solid rgba(255, 255, 255, 0.2); }
          .product-name { color: white; font-size: 1.4rem; font-weight: bold; margin-bottom: 10px; }
          .product-details { color: rgba(255, 255, 255, 0.8); font-size: 1rem; margin-bottom: 8px; }
          .delivery-info { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 20px; margin: 20px 0; }
          .delivery-title { color: #10b981; font-size: 1.2rem; font-weight: bold; margin-bottom: 10px; }
          .delivery-date { color: white; font-size: 1.1rem; font-weight: bold; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .footer { background: rgba(0, 0, 0, 0.3); padding: 30px; text-align: center; }
          .footer-text { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
          .social-links { margin-top: 20px; }
          .social-link { display: inline-block; margin: 0 10px; color: rgba(255, 255, 255, 0.6); text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">PUREBORN</div>
            <div class="tagline">Premium Cold Pressed Oils</div>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${data.customerName}! 👋</div>
            
            <div class="message">
              Your next Pureborn delivery is scheduled for <strong>${new Date(data.nextDeliveryDate).toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</strong>. We're excited to bring you the finest cold-pressed oils!
            </div>

            <div class="subscription-card">
              <div class="product-name">${data.productName}</div>
              <div class="product-details">📦 Variant: ${data.variantName}</div>
              <div class="product-details">🔄 Frequency: ${data.frequency}</div>
              <div class="product-details">📊 Quantity: ${data.quantity} units</div>
              <div class="product-details">💰 Price: ₹${data.totalPrice.toLocaleString()}</div>
            </div>

            <div class="delivery-info">
              <div class="delivery-title">🚚 Delivery Information</div>
              <div class="delivery-date">Expected Delivery: ${new Date(data.nextDeliveryDate).toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
              ${data.deliveryAddress ? `<div style="color: rgba(255, 255, 255, 0.8); margin-top: 10px;">📍 ${data.deliveryAddress}</div>` : ''}
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/subscriptions" class="cta-button">Manage Subscription</a>
            </div>

            <div class="message">
              Thank you for choosing Pureborn for your health and wellness journey. We're committed to delivering the highest quality cold-pressed oils directly to your doorstep.
            </div>
          </div>

          <div class="footer">
            <div class="footer-text">
              <p>Pureborn - Premium Cold Pressed Oils</p>
              <p>📧 info@pureborn.com | 📞 +91 9876543210</p>
              <p>📍 Mumbai, India</p>
            </div>
            <div class="social-links">
              <a href="#" class="social-link">📘 Facebook</a>
              <a href="#" class="social-link">📷 Instagram</a>
              <a href="#" class="social-link">🐦 Twitter</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSubscriptionConfirmationTemplate(data: SubscriptionEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Confirmation - Pureborn</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #1a1a2e, #16213e); }
          .container { max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border-radius: 20px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center; }
          .logo { font-size: 2.5rem; font-weight: bold; color: white; margin-bottom: 10px; }
          .tagline { color: rgba(255, 255, 255, 0.9); font-size: 1.1rem; }
          .content { padding: 40px 30px; }
          .greeting { color: white; font-size: 1.3rem; margin-bottom: 20px; }
          .message { color: rgba(255, 255, 255, 0.8); font-size: 1rem; line-height: 1.6; margin-bottom: 30px; }
          .success-card { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 15px; padding: 25px; margin: 20px 0; }
          .success-title { color: #10b981; font-size: 1.4rem; font-weight: bold; margin-bottom: 15px; }
          .subscription-card { background: rgba(255, 255, 255, 0.1); border-radius: 15px; padding: 25px; margin: 20px 0; border: 1px solid rgba(255, 255, 255, 0.2); }
          .product-name { color: white; font-size: 1.4rem; font-weight: bold; margin-bottom: 10px; }
          .product-details { color: rgba(255, 255, 255, 0.8); font-size: 1rem; margin-bottom: 8px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .footer { background: rgba(0, 0, 0, 0.3); padding: 30px; text-align: center; }
          .footer-text { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">PUREBORN</div>
            <div class="tagline">Premium Cold Pressed Oils</div>
          </div>
          
          <div class="content">
            <div class="greeting">Welcome to Pureborn! 🎉</div>
            
            <div class="success-card">
              <div class="success-title">✅ Subscription Activated Successfully!</div>
              <div style="color: rgba(255, 255, 255, 0.8);">
                Your subscription is now active and your first delivery is scheduled.
              </div>
            </div>

            <div class="message">
              Thank you for choosing Pureborn! We're excited to be part of your health and wellness journey with our premium cold-pressed oils.
            </div>

            <div class="subscription-card">
              <div class="product-name">${data.productName}</div>
              <div class="product-details">📦 Variant: ${data.variantName}</div>
              <div class="product-details">🔄 Frequency: ${data.frequency}</div>
              <div class="product-details">📊 Quantity: ${data.quantity} units</div>
              <div class="product-details">💰 Price: ₹${data.totalPrice.toLocaleString()}</div>
              <div class="product-details">📅 Next Delivery: ${new Date(data.nextDeliveryDate).toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/subscriptions" class="cta-button">Manage Subscription</a>
            </div>

            <div class="message">
              You can manage your subscription anytime through your account dashboard. We'll send you reminders before each delivery.
            </div>
          </div>

          <div class="footer">
            <div class="footer-text">
              <p>Pureborn - Premium Cold Pressed Oils</p>
              <p>📧 info@pureborn.com | 📞 +91 9876543210</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSubscriptionPausedTemplate(data: SubscriptionEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Paused - Pureborn</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #1a1a2e, #16213e); }
          .container { max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border-radius: 20px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 30px; text-align: center; }
          .logo { font-size: 2.5rem; font-weight: bold; color: white; margin-bottom: 10px; }
          .tagline { color: rgba(255, 255, 255, 0.9); font-size: 1.1rem; }
          .content { padding: 40px 30px; }
          .greeting { color: white; font-size: 1.3rem; margin-bottom: 20px; }
          .message { color: rgba(255, 255, 255, 0.8); font-size: 1rem; line-height: 1.6; margin-bottom: 30px; }
          .pause-card { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 15px; padding: 25px; margin: 20px 0; }
          .pause-title { color: #f59e0b; font-size: 1.4rem; font-weight: bold; margin-bottom: 15px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .footer { background: rgba(0, 0, 0, 0.3); padding: 30px; text-align: center; }
          .footer-text { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">PUREBORN</div>
            <div class="tagline">Premium Cold Pressed Oils</div>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${data.customerName}! 👋</div>
            
            <div class="pause-card">
              <div class="pause-title">⏸️ Subscription Paused</div>
              <div style="color: rgba(255, 255, 255, 0.8);">
                Your Pureborn subscription has been paused as requested. No further deliveries will be scheduled until you resume.
              </div>
            </div>

            <div class="message">
              We understand that sometimes you need to take a break. Your subscription is safely paused and you can resume it anytime through your account dashboard.
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/subscriptions" class="cta-button">Resume Subscription</a>
            </div>

            <div class="message">
              When you're ready to resume, just log into your account and click the resume button. We'll be here whenever you need us!
            </div>
          </div>

          <div class="footer">
            <div class="footer-text">
              <p>Pureborn - Premium Cold Pressed Oils</p>
              <p>📧 info@pureborn.com | 📞 +91 9876543210</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSubscriptionResumedTemplate(data: SubscriptionEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Resumed - Pureborn</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #1a1a2e, #16213e); }
          .container { max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border-radius: 20px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center; }
          .logo { font-size: 2.5rem; font-weight: bold; color: white; margin-bottom: 10px; }
          .tagline { color: rgba(255, 255, 255, 0.9); font-size: 1.1rem; }
          .content { padding: 40px 30px; }
          .greeting { color: white; font-size: 1.3rem; margin-bottom: 20px; }
          .message { color: rgba(255, 255, 255, 0.8); font-size: 1rem; line-height: 1.6; margin-bottom: 30px; }
          .resume-card { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 15px; padding: 25px; margin: 20px 0; }
          .resume-title { color: #10b981; font-size: 1.4rem; font-weight: bold; margin-bottom: 15px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .footer { background: rgba(0, 0, 0, 0.3); padding: 30px; text-align: center; }
          .footer-text { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">PUREBORN</div>
            <div class="tagline">Premium Cold Pressed Oils</div>
          </div>
          
          <div class="content">
            <div class="greeting">Welcome back, ${data.customerName}! 🎉</div>
            
            <div class="resume-card">
              <div class="resume-title">▶️ Subscription Resumed</div>
              <div style="color: rgba(255, 255, 255, 0.8);">
                Great news! Your Pureborn subscription has been resumed and your next delivery is scheduled.
              </div>
            </div>

            <div class="message">
              We're excited to continue serving you with our premium cold-pressed oils. Your next delivery will be processed according to your subscription schedule.
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/subscriptions" class="cta-button">View Subscription</a>
            </div>

            <div class="message">
              Thank you for choosing Pureborn. We're committed to delivering the highest quality oils to support your health and wellness journey.
            </div>
          </div>

          <div class="footer">
            <div class="footer-text">
              <p>Pureborn - Premium Cold Pressed Oils</p>
              <p>📧 info@pureborn.com | 📞 +91 9876543210</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSubscriptionCancelledTemplate(data: SubscriptionEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Cancelled - Pureborn</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #1a1a2e, #16213e); }
          .container { max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border-radius: 20px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 40px 30px; text-align: center; }
          .logo { font-size: 2.5rem; font-weight: bold; color: white; margin-bottom: 10px; }
          .tagline { color: rgba(255, 255, 255, 0.9); font-size: 1.1rem; }
          .content { padding: 40px 30px; }
          .greeting { color: white; font-size: 1.3rem; margin-bottom: 20px; }
          .message { color: rgba(255, 255, 255, 0.8); font-size: 1rem; line-height: 1.6; margin-bottom: 30px; }
          .cancel-card { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 15px; padding: 25px; margin: 20px 0; }
          .cancel-title { color: #ef4444; font-size: 1.4rem; font-weight: bold; margin-bottom: 15px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .footer { background: rgba(0, 0, 0, 0.3); padding: 30px; text-align: center; }
          .footer-text { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">PUREBORN</div>
            <div class="tagline">Premium Cold Pressed Oils</div>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${data.customerName}! 👋</div>
            
            <div class="cancel-card">
              <div class="cancel-title">❌ Subscription Cancelled</div>
              <div style="color: rgba(255, 255, 255, 0.8);">
                Your Pureborn subscription has been cancelled as requested. No further deliveries will be scheduled.
              </div>
            </div>

            <div class="message">
              We're sorry to see you go! We understand that circumstances change, and we respect your decision to cancel your subscription.
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/products" class="cta-button">Shop Our Products</a>
            </div>

            <div class="message">
              If you change your mind in the future, you can always create a new subscription or make one-time purchases. We'd love to serve you again!
            </div>
          </div>

          <div class="footer">
            <div class="footer-text">
              <p>Pureborn - Premium Cold Pressed Oils</p>
              <p>📧 info@pureborn.com | 📞 +91 9876543210</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getDeliveryConfirmationTemplate(data: SubscriptionEmailData & { trackingNumber?: string }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Delivery Confirmation - Pureborn</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #1a1a2e, #16213e); }
          .container { max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border-radius: 20px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center; }
          .logo { font-size: 2.5rem; font-weight: bold; color: white; margin-bottom: 10px; }
          .tagline { color: rgba(255, 255, 255, 0.9); font-size: 1.1rem; }
          .content { padding: 40px 30px; }
          .greeting { color: white; font-size: 1.3rem; margin-bottom: 20px; }
          .message { color: rgba(255, 255, 255, 0.8); font-size: 1rem; line-height: 1.6; margin-bottom: 30px; }
          .delivery-card { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 15px; padding: 25px; margin: 20px 0; }
          .delivery-title { color: #10b981; font-size: 1.4rem; font-weight: bold; margin-bottom: 15px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .footer { background: rgba(0, 0, 0, 0.3); padding: 30px; text-align: center; }
          .footer-text { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">PUREBORN</div>
            <div class="tagline">Premium Cold Pressed Oils</div>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${data.customerName}! 🎉</div>
            
            <div class="delivery-card">
              <div class="delivery-title">🚚 Delivery Confirmed!</div>
              <div style="color: rgba(255, 255, 255, 0.8);">
                Your Pureborn order has been successfully delivered. We hope you enjoy your premium cold-pressed oils!
              </div>
              ${data.trackingNumber ? `<div style="color: white; margin-top: 10px; font-weight: bold;">Tracking: ${data.trackingNumber}</div>` : ''}
            </div>

            <div class="message">
              Thank you for choosing Pureborn! We're committed to delivering the highest quality cold-pressed oils to support your health and wellness journey.
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/subscriptions" class="cta-button">Manage Subscriptions</a>
            </div>

            <div class="message">
              If you have any questions about your order or need assistance, please don't hesitate to contact our customer support team.
            </div>
          </div>

          <div class="footer">
            <div class="footer-text">
              <p>Pureborn - Premium Cold Pressed Oils</p>
              <p>📧 info@pureborn.com | 📞 +91 9876543210</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Text versions for email clients that don't support HTML
  private getSubscriptionReminderText(data: SubscriptionEmailData): string {
    return `
Hello ${data.customerName}!

Your next Pureborn delivery is scheduled for ${new Date(data.nextDeliveryDate).toLocaleDateString('en-IN', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}.

Order Details:
- Product: ${data.productName}
- Variant: ${data.variantName}
- Frequency: ${data.frequency}
- Quantity: ${data.quantity} units
- Price: ₹${data.totalPrice.toLocaleString()}

Manage your subscription: ${process.env.FRONTEND_URL}/subscriptions

Thank you for choosing Pureborn!
The Pureborn Team
    `;
  }

  private getSubscriptionConfirmationText(data: SubscriptionEmailData): string {
    return `
Welcome to Pureborn!

Your subscription has been activated successfully.

Order Details:
- Product: ${data.productName}
- Variant: ${data.variantName}
- Frequency: ${data.frequency}
- Quantity: ${data.quantity} units
- Price: ₹${data.totalPrice.toLocaleString()}
- Next Delivery: ${new Date(data.nextDeliveryDate).toLocaleDateString('en-IN', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

Manage your subscription: ${process.env.FRONTEND_URL}/subscriptions

Thank you for choosing Pureborn!
The Pureborn Team
    `;
  }

  private getSubscriptionPausedText(data: SubscriptionEmailData): string {
    return `
Hello ${data.customerName}!

Your Pureborn subscription has been paused as requested. No further deliveries will be scheduled until you resume.

Resume your subscription: ${process.env.FRONTEND_URL}/subscriptions

We'll be here whenever you need us!
The Pureborn Team
    `;
  }

  private getSubscriptionResumedText(data: SubscriptionEmailData): string {
    return `
Welcome back, ${data.customerName}!

Your Pureborn subscription has been resumed successfully. Your next delivery will be scheduled according to your subscription plan.

Manage your subscription: ${process.env.FRONTEND_URL}/subscriptions

Thank you for choosing Pureborn!
The Pureborn Team
    `;
  }

  private getSubscriptionCancelledText(data: SubscriptionEmailData): string {
    return `
Hello ${data.customerName}!

Your Pureborn subscription has been cancelled as requested. No further deliveries will be scheduled.

Shop our products: ${process.env.FRONTEND_URL}/products

We'd love to serve you again in the future!
The Pureborn Team
    `;
  }

  private getDeliveryConfirmationText(data: SubscriptionEmailData & { trackingNumber?: string }): string {
    return `
Hello ${data.customerName}!

Your Pureborn order has been successfully delivered!

${data.trackingNumber ? `Tracking Number: ${data.trackingNumber}` : ''}

Manage your subscriptions: ${process.env.FRONTEND_URL}/subscriptions

Thank you for choosing Pureborn!
The Pureborn Team
    `;
  }
}

export default EmailService;
