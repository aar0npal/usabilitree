import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { Header } from "@/app/(landing)/_sections/header";
import { Footer } from "@/app/(landing)/_sections/footer";

export const metadata: Metadata = {
  title: {
    template: "%s | UsabiliTree",
    default: "UsabiliTree",
  },
  description: "Legal documents for UsabiliTree, including privacy policy and terms of service.",
};

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <>
      <Header user={user} />
      <section className="mx-auto max-w-3xl px-4 py-28 lg:pb-32 lg:pt-44">
        <article className="prose prose-lg dark:prose-invert">{children}</article>
      </section>
      <Footer />
    </>
  );
}
