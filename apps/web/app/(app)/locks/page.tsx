import Link from "next/link";
import { MyPositions } from "../my-positions";

export default function LocksPage() {
  return (
    <main className="wrap">
      <div className="page-title-row" style={{ marginBottom: 24 }}>
        <div className="page-head" style={{ marginBottom: 0 }}>
          <h1>Locks</h1>
          <p className="page-lede">Tokens held until one fixed unlock date. Withdraw once it passes.</p>
        </div>
        <Link href="/locks?create=lock" scroll={false} className="btn btn-primary">
          + Create new
        </Link>
      </div>
      <MyPositions kind="lock" />
    </main>
  );
}
