import { Hero } from "@/components/hero/Hero";
import { Works } from "@/components/sections/Works";
import { Services } from "@/components/sections/Services";
import { Manifesto } from "@/components/sections/Manifesto";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Works />
      <Services />
      <Manifesto />
      <Contact />
    </>
  );
}
