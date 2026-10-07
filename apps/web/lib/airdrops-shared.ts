import { isAddress, parseUnits, formatUnits } from "viem";

export interface AirdropRecipientView {
  recipient: string;
  amount: string; // formatted human-readable or string raw
  isClaimed: boolean;
  claimedAt?: string | null;
  claimTxHash?: string | null;
}

export interface AirdropCampaignView {
  chainId: number;
  campaignId: string;
  creator: string;
  token: string;
  tokenSymbol: string;
  tokenDecimals: number;
  name: string;
  description?: string | null;
  totalAmount: string;
  totalRecipients: number;
  claimedAmount: string;
  claimedCount: number;
  mode: "instant" | "vesting";
  startTime: string; // unix timestamp (seconds)
  endTime?: string | null;
  vestingDuration?: string | null;
  txHash?: string | null;
  createdAt: string;
  userAllocation?: AirdropRecipientView | null;
}

export interface ParsedRecipientRow {
  address: `0x${string}`;
  amount: string;
  amountRaw: bigint;
}

export interface RecipientParseResult {
  valid: boolean;
  rows: ParsedRecipientRow[];
  errors: string[];
  totalRaw: bigint;
  totalFormatted: string;
}

export function parseRecipientsList(
  input: string,
  decimals: number = 18
): RecipientParseResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ParsedRecipientRow[] = [];
  const errors: string[] = [];
  const seenAddresses = new Set<string>();
  let totalRaw = 0n;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    // Split by comma, tab, or whitespace
    const parts = line.split(/[,;\s\t]+/).filter(Boolean);
    if (parts.length < 2) {
      errors.push(`Line ${lineNum}: Invalid format. Expected 'address, amount'`);
      continue;
    }

    const addr = parts[0];
    const amtStr = parts[1];

    if (!isAddress(addr)) {
      errors.push(`Line ${lineNum}: Invalid Ethereum address '${addr}'`);
      continue;
    }

    const normalizedAddr = addr.toLowerCase() as `0x${string}`;
    if (seenAddresses.has(normalizedAddr)) {
      errors.push(`Line ${lineNum}: Duplicate recipient address '${addr}'`);
      continue;
    }

    try {
      const parsedAmt = parseUnits(amtStr, decimals);
      if (parsedAmt <= 0n) {
        errors.push(`Line ${lineNum}: Amount must be greater than 0`);
        continue;
      }

      seenAddresses.add(normalizedAddr);
      rows.push({
        address: normalizedAddr,
        amount: amtStr,
        amountRaw: parsedAmt,
      });
      totalRaw += parsedAmt;
    } catch {
      errors.push(`Line ${lineNum}: Invalid amount format '${amtStr}'`);
    }
  }

  return {
    valid: errors.length === 0 && rows.length > 0,
    rows,
    errors,
    totalRaw,
    totalFormatted: formatUnits(totalRaw, decimals),
  };
}
