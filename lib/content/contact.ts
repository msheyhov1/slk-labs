import { contacts } from "@/lib/site";

export const contact = {
  index: "04 / Контакт",
  titleLines: ["Расскажите", "о проекте"],
  cta: {
    label: "Хочу такой же",
    href: `mailto:${contacts.email}?subject=${encodeURIComponent("Хочу такой же")}`,
  },
  email: contacts.email,
  telegram: contacts.telegram,
  location: contacts.location,
  legal: "SLK-labs © 2026 — разработка и автоматизация",
  stack: "NEXT · TAILWIND · GSAP · LENIS · THREE",
} as const;
