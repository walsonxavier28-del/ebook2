// Supabase Edge Function (Deno) — dispara e-mails usando o Gmail (Nodemailer).
// Deploy: supabase functions deploy send-email
// Segredos necessários: supabase secrets set GMAIL_USER=... GMAIL_PASS=...

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.13";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
const EMAIL_FROM = `eBookly <${GMAIL_USER}>`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomePayload {
  type: "welcome";
  to: string;
  fullName: string;
}

interface PurchasePayload {
  type: "purchase_confirmed";
  to: string;
  buyerName: string;
  productTitle: string;
  downloadUrl: string;
}

interface SaleNotificationProducerPayload {
  type: "sale_notification_producer";
  to: string;
  producerName: string;
  productTitle: string;
  netAmount: number;
}

interface SaleNotificationAffiliatePayload {
  type: "sale_notification_affiliate";
  to: string;
  affiliateName: string;
  productTitle: string;
  commissionAmount: number;
}

type Payload = WelcomePayload | PurchasePayload | SaleNotificationProducerPayload | SaleNotificationAffiliatePayload;

function buildEmail(payload: Payload): { subject: string; html: string } {
  if (payload.type === "welcome") {
    return {
      subject: "Bem-vindo à eBookly!",
      html: `
        <div style="font-family: Inter, Arial, sans-serif; background:#0B0F19; padding:32px; color:#ffffff;">
          <h1 style="color:#3D8BFF; font-size:22px;">Bem-vindo à eBookly, ${payload.fullName}!</h1>
          <p style="font-size:15px; line-height:1.6;">Conhecimento que transforma.</p>
          <p style="font-size:14px; line-height:1.6; color:#B7C0D8;">
            A sua conta foi criada com sucesso. Já pode explorar e-books e infoprodutos
            de criadores moçambicanos, ou começar a vender o seu próprio conteúdo.
          </p>
        </div>
      `,
    };
  }

  if (payload.type === "purchase_confirmed") {
    return {
      subject: `A sua compra de "${payload.productTitle}" foi confirmada`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; background:#0B0F19; padding:32px; color:#ffffff;">
          <h1 style="color:#3D8BFF; font-size:22px;">Pagamento confirmado, ${payload.buyerName}!</h1>
          <p style="font-size:15px; line-height:1.6;">
            O seu pagamento para <strong>${payload.productTitle}</strong> foi validado.
          </p>
          <a href="${payload.downloadUrl}"
             style="display:inline-block; margin-top:16px; background:#0066FF; color:#fff;
                    padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
            Descarregar o meu e-book
          </a>
          <p style="font-size:13px; color:#B7C0D8; margin-top:24px;">
            Guarde este e-mail — o link de download continua acessível através da sua conta em eBookly.
          </p>
        </div>
      `,
    };
  }

  if (payload.type === "sale_notification_producer") {
    return {
      subject: `Venda realizada! "${payload.productTitle}"`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; background:#0B0F19; padding:32px; color:#ffffff;">
          <h1 style="color:#3D8BFF; font-size:22px;">Boas notícias, ${payload.producerName}!</h1>
          <p style="font-size:15px; line-height:1.6;">
            Acabou de realizar uma nova venda do produto <strong>${payload.productTitle}</strong>.
          </p>
          <p style="font-size:16px; font-weight:bold; color:#0066FF; margin-top:16px;">
            Valor líquido recebido: ${Number(payload.netAmount).toLocaleString("pt-MZ")} MT
          </p>
          <p style="font-size:13px; color:#B7C0D8; margin-top:24px;">
            Este valor já inclui os descontos de eventuais comissões de afiliados. O saldo está disponível no seu painel.
          </p>
        </div>
      `,
    };
  }

  return {
    subject: `Comissão ganha! "${payload.productTitle}"`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; background:#0B0F19; padding:32px; color:#ffffff;">
        <h1 style="color:#3D8BFF; font-size:22px;">Parabéns, ${payload.affiliateName}!</h1>
        <p style="font-size:15px; line-height:1.6;">
          Uma venda foi realizada através do seu link de afiliado para o produto <strong>${payload.productTitle}</strong>.
        </p>
        <p style="font-size:16px; font-weight:bold; color:#0066FF; margin-top:16px;">
          A sua comissão: ${Number(payload.commissionAmount).toLocaleString("pt-MZ")} MT
        </p>
        <p style="font-size:13px; color:#B7C0D8; margin-top:24px;">
          Continue a partilhar os seus links para ganhar ainda mais!
        </p>
      </div>
    `,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GMAIL_USER || !GMAIL_PASS) {
      throw new Error("Credenciais do Gmail (GMAIL_USER ou GMAIL_PASS) não configuradas nos secrets da função.");
    }

    const payload = (await req.json()) as Payload;
    const { subject, html } = buildEmail(payload);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: payload.to,
      replyTo: GMAIL_USER,
      subject: subject,
      html: html,
    });

    return new Response(JSON.stringify({ ok: true, data: info }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
