import { Header } from "./_sections/header";
import { HeroSection } from "./_sections/hero";
import { PricingSection } from "./_sections/pricing";
import { Footer } from "./_sections/footer";
import FAQ from "./_sections/faq";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = {
  title: "Free Tree Testing Tool",
  description:
    "Create, conduct, and analyze tree tests for free. Optimize your information architecture with valuable insights.",
};

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main>
      <Header user={user} />
      <HeroSection user={user} />
      <PricingSection />
      <FAQ />
      <Footer />
    </main>
  );
}
