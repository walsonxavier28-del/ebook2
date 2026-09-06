import { supabase, Transaction, Product } from "./supabase";

export async function creditWalletFromPayment(transactionId: string) {
  // 1. Ir buscar a transação e o produto
  const { data: txData, error: txError } = await supabase
    .from("transactions")
    .select("*, product:products(*)")
    .eq("id", transactionId)
    .single();

  if (txError || !txData) {
    throw new Error("Transação não encontrada.");
  }

  const tx = txData as Transaction & { product: Product };

  if (tx.status !== "completed") {
    throw new Error("A transação precisa de estar 'completed' antes de creditar o saldo.");
  }

  // 2. Verificar se já foi creditada (Idempotência)
  const { data: existingLedger } = await supabase
    .from("wallet_ledger")
    .select("id")
    .eq("reference_transaction_id", transactionId)
    .limit(1);

  if (existingLedger && existingLedger.length > 0) {
    console.log("Transação já creditada no wallet_ledger.");
    return;
  }

  const amount = Number(tx.amount);
  const ledgerEntries = [];

  // 3. Determinar os cortes (Afiliado vs Produtor)
  if (tx.affiliate_id && tx.affiliate_commission_amount) {
    const affiliateCut = Number(tx.affiliate_commission_amount);
    const producerCut = amount - affiliateCut;

    if (affiliateCut > 0) {
      ledgerEntries.push({
        profile_id: tx.affiliate_id,
        amount: affiliateCut,
        type: "affiliate_commission",
        reference_transaction_id: transactionId,
        description: `Comissão de afiliado: ${tx.product.title}`,
      });
    }

    if (producerCut > 0) {
      ledgerEntries.push({
        profile_id: tx.product.producer_id,
        amount: producerCut,
        type: "sale_earning",
        reference_transaction_id: transactionId,
        description: `Venda com afiliado: ${tx.product.title}`,
      });
    }
  } else {
    // Apenas Produtor
    ledgerEntries.push({
      profile_id: tx.product.producer_id,
      amount: amount,
      type: "sale_earning",
      reference_transaction_id: transactionId,
      description: `Venda direta: ${tx.product.title}`,
    });
  }

  // 4. Inserir no ledger (O Trigger encarrega-se de atualizar os saldos no profile)
  if (ledgerEntries.length > 0) {
    const { error: ledgerError } = await supabase.from("wallet_ledger").insert(ledgerEntries);
    if (ledgerError) {
      throw new Error(`Erro ao inserir no wallet_ledger: ${ledgerError.message}`);
    }
  }
}
