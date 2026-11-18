import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-layout"><Link className="auth-brand" href="/">◒ DAYFLOW</Link>{children}</main>;
}
