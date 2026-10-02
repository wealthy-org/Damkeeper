"use client";

import { useState } from "react";
import { WithdrawSuccessModal, WithdrawSuccessDetails } from "../withdraw-success-modal";

export default function PreviewWithdrawPage() {
  const [modalDetails, setModalDetails] = useState<WithdrawSuccessDetails | null>({
    kind: "lock",
    positionId: "1",
    amount: "5,000",
    tokenSymbol: "DAM",
    beneficiary: "0x9178B573219C55586BbAf51Ecb24ACfb27BB7681",
    txHash: "0xddb78f4bd247fbf4f2c01460f52c4407407a304ef312944c1320767929949f4e",
    chainId: 4663,
    managerAddress: "0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE",
  });

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="card" style={{ maxWidth: 640, margin: "0 auto", padding: 28 }}>
        <div className="card-head" style={{ marginBottom: 16 }}>
          <h2>Withdraw & Claim Success Modal Preview</h2>
        </div>
        <p style={{ color: "var(--muted)", marginBottom: 20 }}>
          Halaman ini khusus untuk mencoba dan melihat tampilan Popup Sukses Withdraw/Claim secara instan tanpa perlu transaksi onchain atau lock ulang.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            onClick={() =>
              setModalDetails({
                kind: "lock",
                positionId: "1",
                amount: "5,000",
                tokenSymbol: "DAM",
                beneficiary: "0x9178B573219C55586BbAf51Ecb24ACfb27BB7681",
                txHash: "0xddb78f4bd247fbf4f2c01460f52c4407407a304ef312944c1320767929949f4e",
                chainId: 4663,
                managerAddress: "0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE",
              })
            }
          >
            Preview: Lock Withdraw (5,000 DAM)
          </button>

          <button
            className="btn btn-ghost"
            onClick={() =>
              setModalDetails({
                kind: "vesting",
                positionId: "42",
                amount: "250,000",
                tokenSymbol: "DAM",
                beneficiary: "0x9178B573219C55586BbAf51Ecb24ACfb27BB7681",
                txHash: "0xddb78f4bd247fbf4f2c01460f52c4407407a304ef312944c1320767929949f4e",
                chainId: 4663,
                managerAddress: "0x2414E58801FABE792DEbd2C8930FC5ff3Cd004FE",
              })
            }
          >
            Preview: Vesting Claim (250,000 DAM)
          </button>
        </div>

        {modalDetails === null && (
          <p style={{ fontSize: 13, color: "var(--accent)", marginTop: 20 }}>
            Popup sedang ditutup. Klik salah satu tombol di atas untuk membukanya kembali.
          </p>
        )}
      </div>

      <WithdrawSuccessModal
        open={!!modalDetails}
        details={modalDetails}
        onClose={() => setModalDetails(null)}
      />
    </main>
  );
}
