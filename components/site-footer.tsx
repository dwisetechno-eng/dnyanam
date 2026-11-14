"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Camera,
  CreditCard,
  Mail,
  MessageCircle,
  Play,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { useI18n } from "@/lib/i18n/provider";
import { localeNames } from "@/lib/i18n/config";
import type { Language } from "@/lib/types";

const shopLinks = [
  { href: "/browse", key: "browse.collectionAll" },
  { href: "/browse?collection=trending", key: "browse.collectionTrending" },
  { href: "/browse?collection=magazines", key: "browse.collectionMagazines" },
  { href: "/browse?type=ebook", key: "browse.collectionEbooks" },
  { href: "/browse?collection=physical", key: "browse.collectionPhysical" },
];

const companyLinks = [
  { href: "/info/about", key: "footer.about" },
  { href: "/radio", key: "nav.radio" },
  { href: "/profile", key: "nav.profile" },
  { href: "/info/contact", key: "footer.contact" },
  { href: "/library", key: "nav.library" },
];

const supportLinks = [
  { href: "/info/faq", key: "footer.faq" },
  { href: "/info/returns", key: "footer.returns" },
  { href: "/info/privacy", key: "footer.privacy" },
  { href: "/info/terms", key: "footer.terms" },
];

const socials = [
  { label: "Instagram", href: "https://instagram.com", Icon: Camera },
  { label: "Facebook", href: "https://facebook.com", Icon: MessageCircle },
  { label: "X", href: "https://x.com", Icon: Send },
  { label: "YouTube", href: "https://youtube.com", Icon: Play },
];

export function SiteFooter({ languages }: { languages: Language[] }) {
  const { t, locale } = useI18n();
  const year = new Date().getFullYear();
  const currentLanguage = languages.find((language) => language.code === locale);

  return (
    <footer className="mt-16 border-t border-white/10 bg-ink-950/70">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-5 text-sm leading-relaxed text-white/50">
              {t("footer.tagline")}
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/50">
              <Mail className="h-3.5 w-3.5 text-saffron-400" />
              {t("footer.languageNote", {
                language:
                  currentLanguage?.name_native ?? localeNames[locale],
              })}
            </div>
            <div className="mt-5 flex items-center gap-2">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 transition hover:border-saffron-400/40 hover:text-saffron-300"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title={t("footer.shop")} links={shopLinks} />
          <FooterColumn title={t("footer.company")} links={companyLinks} />
          <FooterColumn title={t("footer.support")} links={supportLinks} />
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.copyright", { year })}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" />
              {t("footer.payments")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-saffron-400/80" />
              Razorpay
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; key: string }>;
}) {
  const { t } = useI18n();
  return (
    <div>
      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={`${link.href}-${link.key}`}>
            <Link
              href={link.href}
              className="group inline-flex items-center gap-1 text-sm font-medium text-white/55 transition hover:text-cream"
            >
              {t(link.key)}
              <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-60" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
