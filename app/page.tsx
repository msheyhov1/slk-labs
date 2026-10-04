import { Hero } from "@/components/hero/Hero";
import { Works } from "@/components/sections/Works";
import { Services } from "@/components/sections/Services";
import { Manifesto } from "@/components/sections/Manifesto";
import { Contact } from "@/components/sections/Contact";
import ScrollJourney from "@/components/ScrollJourney";

// id="top" живёт на <main> (цель skip-link и логотипа), а не на запиненном герое:
// во время пина секция position:fixed, её rect ≠ смещение в документе. Contact — <footer> вне main.
export default function Home() {
  return (
    <>
      <main id="top">
        <Hero />
        <Works />
        <Services />
        <Manifesto />
      </main>
      <Contact />
      <ScrollJourney />
    </>
  );
}
