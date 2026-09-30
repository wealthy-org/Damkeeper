import Link from "next/link";
import { MyPositions } from "../my-positions";

export default function VestingPage() {
  return (
    <main className="wrap">
      <div className="page-title-row" style={{ marginBottom: 24 }}>
        <div className="page-head" style={{ marginBottom: 0 }}>
          <h1>Vesting</h1>
          <p className="page-lede">Tokens released every second from start to end, with an optional cliff. Claim as they vest.</p>
        </div>
        <Link href="/vesting?create=vesting" scroll={false} className="btn btn-primary">
          + Create new
        </Link>
      </div>
      <MyPositions kind="vesting" />
    </main>
  );
}
