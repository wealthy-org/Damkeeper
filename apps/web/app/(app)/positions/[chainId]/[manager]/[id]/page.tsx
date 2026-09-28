import { db } from "@/db/client";
import { positions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { vestedAmount, claimableAmount, vestingStatus, lockStatus } from "@damkeeper/domain/vesting";
import { notFound } from "next/navigation";
import { ProofAction } from "./proof-action";

export const dynamic = "force-dynamic";

export default async function ProofPage({
  params,
}: {
  params: { chainId: string; manager: string; id: string };
}) {
  const chainId = Number(params.chainId);
  const manager = params.manager.toLowerCase();
  const positionId = BigInt(params.id);

  const [position] = await db
    .select()
    .from(positions)
    .where(
      and(
        eq(positions.chainId, chainId),
        eq(positions.managerAddress, manager),
        eq(positions.positionId, positionId)
      )
    )
    .limit(1);

  if (!position) notFound();

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isVesting = position.kind === "vesting";

  return (
    <main className="wrap">
      <div className="page-head">
        <div className="page-eyebrow">
          <span className="dot" />
          Public proof
        </div>
        <span className="badge" style={{ width: "fit-content" }}>
          {isVesting ? "VESTING" : "LOCK"} · POSITION #{position.positionId.toString()}
        </span>
        <h1 className="mono" style={{ fontSize: 20, wordBreak: "break-all" }}>
          {position.token}
        </h1>
        <p className="page-lede">On chain {chainId}. Read directly from indexed contract events.</p>
      </div>

      <section className="card">
        <dl className="kv mono">
          <Row label="Creator" value={position.creator} />
          <Row label="Beneficiary" value={position.beneficiary} />
          <Row label="Deposited" value={position.amount} />
          {isVesting ? (
            <>
              <Row label="Claimed" value={position.claimedAmount} />
              <Row
                label="Vested now"
                value={vestedAmount(
                  {
                    totalAmount: BigInt(position.amount),
                    startTime: position.startTime ?? 0n,
                    cliffTime: position.cliffTime ?? 0n,
                    endTime: position.endTime ?? 0n,
                    claimedAmount: BigInt(position.claimedAmount),
                  },
                  now
                ).toString()}
              />
              <Row
                label="Claimable now"
                value={claimableAmount(
                  {
                    totalAmount: BigInt(position.amount),
                    startTime: position.startTime ?? 0n,
                    cliffTime: position.cliffTime ?? 0n,
                    endTime: position.endTime ?? 0n,
                    claimedAmount: BigInt(position.claimedAmount),
                  },
                  now
                ).toString()}
              />
              <Row
                label="Status"
                value={vestingStatus(
                  {
                    totalAmount: BigInt(position.amount),
                    startTime: position.startTime ?? 0n,
                    cliffTime: position.cliffTime ?? 0n,
                    endTime: position.endTime ?? 0n,
                    claimedAmount: BigInt(position.claimedAmount),
                  },
                  now
                )}
              />
            </>
          ) : (
            <Row
              label="Status"
              value={lockStatus(position.unlockTime ?? 0n, position.withdrawn, now)}
            />
          )}
        </dl>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{isVesting ? "Claim" : "Withdraw"}</h2>
        </div>
        <ProofAction
          kind={position.kind as "lock" | "vesting"}
          manager={position.managerAddress}
          positionId={position.positionId.toString()}
          beneficiary={position.beneficiary}
          amount={position.amount}
          claimedAmount={position.claimedAmount}
          unlockTime={position.unlockTime?.toString() ?? null}
          startTime={position.startTime?.toString() ?? null}
          cliffTime={position.cliffTime?.toString() ?? null}
          endTime={position.endTime?.toString() ?? null}
          withdrawn={position.withdrawn}
        />
      </section>

      <p style={{ marginTop: 20, fontSize: 11, color: "var(--faint)", fontFamily: "var(--mono)", lineHeight: 1.8 }}>
        Not financial advice. A lock proves only that this specific allocation sits in the
        contract under these terms.
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
