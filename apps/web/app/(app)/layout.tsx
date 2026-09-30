import { Providers } from "./providers";
import { Shell } from "./shell";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Shell>{children}</Shell>
    </Providers>
  );
}
