import { Providers } from "./providers";
import { AppNav } from "./nav";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AppNav />
      {children}
    </Providers>
  );
}
