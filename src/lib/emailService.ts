import { supabase } from "./supabase";

/**
 * Todos os e-mails são disparados através da Supabase Edge Function
 * "send-email", que por sua vez chama a API do Resend com a chave
 * secreta guardada em `supabase secrets set RESEND_API_KEY=...`.
 *
 * Isto evita expor a chave da Resend no bundle do frontend.
 */

type EmailPayload =
  | {
      type: "welcome";
      to: string;
      fullName: string;
    }
  | {
      type: "purchase_confirmed";
      to: string;
      buyerName: string;
      productTitle: string;
      downloadUrl: string;
    }
  | {
      type: "sale_notification_producer";
      to: string;
      producerName: string;
      productTitle: string;
      netAmount: number;
    }
  | {
      type: "sale_notification_affiliate";
      to: string;
      affiliateName: string;
      productTitle: string;
      commissionAmount: number;
    };

async function sendEmail(payload: EmailPayload) {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: payload,
  });

  if (error) {
    console.error("Falha ao enviar e-mail:", error);
    throw new Error("Não foi possível enviar o e-mail. Tente novamente.");
  }

  return data;
}

export async function sendWelcomeEmail(to: string, fullName: string) {
  return sendEmail({ type: "welcome", to, fullName });
}

export async function sendPurchaseConfirmationEmail(params: {
  to: string;
  buyerName: string;
  productTitle: string;
  downloadUrl: string;
}) {
  return sendEmail({
    type: "purchase_confirmed",
    to: params.to,
    buyerName: params.buyerName,
    productTitle: params.productTitle,
    downloadUrl: params.downloadUrl,
  });
}

export async function sendProducerSaleNotification(params: {
  to: string;
  producerName: string;
  productTitle: string;
  netAmount: number;
}) {
  return sendEmail({
    type: "sale_notification_producer",
    to: params.to,
    producerName: params.producerName,
    productTitle: params.productTitle,
    netAmount: params.netAmount,
  });
}

export async function sendAffiliateCommissionEmail(params: {
  to: string;
  affiliateName: string;
  productTitle: string;
  commissionAmount: number;
}) {
  return sendEmail({
    type: "sale_notification_affiliate",
    to: params.to,
    affiliateName: params.affiliateName,
    productTitle: params.productTitle,
    commissionAmount: params.commissionAmount,
  });
}
