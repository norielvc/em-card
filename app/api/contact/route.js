import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { requireAuth } from '../../../lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function sendEmailNotification({ name, email, inquiry_type, message }) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    return { skipped: true, reason: 'Missing env vars' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });

    const info = await transporter.sendMail({
      from: `"EM Card" <${gmailUser}>`,
      to: 'admin@em-card.com',
      subject: `New Contact Inquiry: ${inquiry_type || 'General'} from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            .wrapper { width: 100%; max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #064e3b 0%, #10b981 100%); padding: 32px 36px; text-align: center; }
            .header h1 { color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.3px; }
            .header p { color: rgba(255,255,255,0.85); font-size: 13px; margin: 0; }
            .badge { display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 12px; border-radius: 999px; margin-top: 12px; }
            .body { padding: 32px 36px; }
            .field { margin-bottom: 20px; }
            .field-label { font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }
            .field-value { font-size: 15px; color: #111827; line-height: 1.5; margin: 0; }
            .field-value a { color: #10b981; text-decoration: none; }
            .message-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px 20px; margin-top: 6px; }
            .message-box p { margin: 0; font-size: 15px; color: #374151; line-height: 1.65; white-space: pre-wrap; }
            .footer { padding: 20px 36px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; }
            .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
            .footer a { color: #10b981; text-decoration: none; font-weight: 600; }
            @media only screen and (max-width: 520px) {
              .wrapper { margin: 0; border-radius: 0; }
              .header, .body, .footer { padding-left: 20px; padding-right: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="header">
              <h1>New Contact Inquiry</h1>
              <p>EM Card — Epektibong Mamamayan</p>
              <span class="badge">${inquiry_type || 'General'}</span>
            </div>
            <div class="body">
              <div class="field">
                <div class="field-label">Sender Name</div>
                <p class="field-value">${name}</p>
              </div>
              <div class="field">
                <div class="field-label">Email Address</div>
                <p class="field-value"><a href="mailto:${email}">${email}</a></p>
              </div>
              <div class="field">
                <div class="field-label">Inquiry Type</div>
                <p class="field-value">${inquiry_type || 'General'}</p>
              </div>
              <div class="field">
                <div class="field-label">Message</div>
                <div class="message-box">
                  <p>${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                </div>
              </div>
            </div>
            <div class="footer">
              <p>Submitted via <a href="https://em-card.com">em-card.com</a> · ${new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    return { sent: true, id: info.messageId };
  } catch (err) {
    return { error: err.message, code: err.code || null };
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, inquiry_type, message } = body;

    if (!name || !email || !message) {
      return Response.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }

    // 1. Save to database
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .insert([{ name, email, inquiry_type, message }])
      .select()
      .single();

    if (error) throw error;

    // 2. Send email notification (non-blocking)
    const emailResult = await sendEmailNotification({ name, email, inquiry_type, message });

    return Response.json({ success: true, message: data, email: emailResult });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ messages: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
