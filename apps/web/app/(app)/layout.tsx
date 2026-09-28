import { Providers } from "./providers";
import { AppNav } from "./nav";
import { WrongNetworkBanner } from "./wrong-network-banner";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AppNav />
      <WrongNetworkBanner />
      {children}
    </Providers>
  );
}
