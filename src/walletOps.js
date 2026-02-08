const { PublicKey, SystemProgram, Transaction, VersionedTransaction, TransactionMessage, Keypair } = require('@solana/web3.js');
const {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getMint,
} = require('@solana/spl-token');
const { getConnection } = require('./pumpportal');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableTxError(err) {
  const msg = ((err && err.message) ? err.message : String(err || '')).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('rate') ||
    msg.includes('too many requests') ||
    msg.includes('blockhash') ||
    msg.includes('timed out') ||
    msg.includes('node is behind') ||
    msg.includes('socket hang up') ||
    msg.includes('fetch failed')
  );
}

function toTokenAmountRaw(amountTokens, decimals) {
  const raw = String(amountTokens == null ? '' : amountTokens).trim();
  if (!raw) return 0n;
  if (!/^\d+(\.\d+)?$/.test(raw)) return 0n;
  const parts = raw.split('.');
  const whole = parts[0] || '0';
  const frac = (parts[1] || '').slice(0, decimals).padEnd(decimals, '0');
  const normalized = (whole + frac).replace(/^0+/, '') || '0';
  return BigInt(normalized);
}

async function sendLegacyTxInternal(connection, ixList, signers) {
  const maxAttempts = 3;
  let lastErr = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const msg = new TransactionMessage({
        payerKey: signers[0].publicKey,
        recentBlockhash: blockhash,
        instructions: ixList,
      }).compileToLegacyMessage();
      const vtx = new VersionedTransaction(msg);
      vtx.sign(signers);
      const sig = await connection.sendRawTransaction(vtx.serialize(), { skipPreflight: true, maxRetries: 3 });
      const conf = await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
      if (conf.value && conf.value.err) throw new Error('Tx failed: ' + JSON.stringify(conf.value.err));
      return sig;
    } catch (e) {
      lastErr = e;
      if (attempt >= maxAttempts - 1 || !isRetryableTxError(e)) throw e;
      await sleep(250 + attempt * 400);
    }
  }
  throw lastErr || new Error('Legacy transaction failed');
}

async function sendLegacyTx(connection, ixList, payer) {
  return await sendLegacyTxInternal(connection, ixList, [payer]);
}

async function sendLegacyTxWithSigners(connection, ixList, feePayer, additionalSigners = []) {
  return await sendLegacyTxInternal(connection, ixList, [feePayer, ...additionalSigners]);
}

async function transferSol({ fromKeypair, toPubkey, amountSol }) {
  const connection = getConnection();
  const to = new PublicKey(toPubkey);
  const requestedLamports = Math.floor(Number(amountSol) * 1e9);

  // Fetch current balance to ensure we leave enough to pay fees
  const balanceLamports = await connection.getBalance(fromKeypair.publicKey, 'confirmed');

  // Build a dummy message to estimate the exact fee for this transfer
  const dummyIx = SystemProgram.transfer({ fromPubkey: fromKeypair.publicKey, toPubkey: to, lamports: 1 });
  const { blockhash } = await connection.getLatestBlockhash();
  const dummyMsg = new TransactionMessage({
    payerKey: fromKeypair.publicKey,
    recentBlockhash: blockhash,
    instructions: [dummyIx],
  }).compileToLegacyMessage();

  let feeLamports = 5000; // sensible default (~0.000005 SOL)
  try {
    const feeRes = await connection.getFeeForMessage(dummyMsg, 'confirmed');
    // Handle both number and {value} shapes across web3 versions
    feeLamports = typeof feeRes === 'number' ? feeRes : (feeRes && typeof feeRes.value === 'number' ? feeRes.value : feeLamports);
  } catch (_) {
    // keep default if estimation fails
  }

  // Small safety buffer above the estimated fee
  const safetyLamports = 5000; // ~0.000005 SOL
  const maxSendLamports = Math.max(0, balanceLamports - feeLamports - safetyLamports);
  if (maxSendLamports <= 0) throw new Error('Insufficient SOL to cover network fee');

  const finalLamports = Math.min(requestedLamports, maxSendLamports);
  if (finalLamports <= 0) throw new Error('Transfer amount too low after fee reservation');

  const ix = SystemProgram.transfer({ fromPubkey: fromKeypair.publicKey, toPubkey: to, lamports: finalLamports });
  return await sendLegacyTx(connection, [ix], fromKeypair);
}

async function transferSpl({ fromKeypair, toPubkey, mint, amountTokens }) {
  const connection = getConnection();
  const mintPk = new PublicKey(mint);
  const to = new PublicKey(toPubkey);
  const fromAta = await getAssociatedTokenAddress(mintPk, fromKeypair.publicKey, false);
  const toAta = await getAssociatedTokenAddress(mintPk, to, false);
  const ixList = [];
  // ensure recipient ATA
  const toInfo = await connection.getAccountInfo(toAta);
  if (!toInfo) {
    ixList.push(createAssociatedTokenAccountInstruction(fromKeypair.publicKey, toAta, to, mintPk));
  }
  const mintInfo = await getMint(connection, mintPk);
  const decimals = mintInfo.decimals ?? 0;
  const amount = toTokenAmountRaw(amountTokens, decimals);
  if (amount <= 0n) throw new Error('Token amount must be greater than zero');
  ixList.push(createTransferInstruction(fromAta, toAta, fromKeypair.publicKey, amount));
  return await sendLegacyTx(connection, ixList, fromKeypair);
}

module.exports = {
  transferSol,
  transferSpl,
  sendLegacyTxWithSigners,
};
