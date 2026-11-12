import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import { getServerI18n, getServerLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/types";

const slugs = ["about", "contact", "privacy", "terms", "returns", "faq"] as const;
type InfoSlug = (typeof slugs)[number];

const icons = {
  about: Users,
  contact: Mail,
  privacy: ShieldCheck,
  terms: ShieldCheck,
  returns: Truck,
  faq: HelpCircle,
} as const;

const copy: Record<
  InfoSlug,
  Record<Locale, { intro: string; points: string[] }>
> = {
  about: {
    mr: {
      intro:
        "ज्ञानम् हे भारतीय भाषांमधील पुस्तके, ई-पुस्तके आणि नियतकालिके एकाच व्यासपीठावर आणणारे दुकान आहे.",
      points: [
        "११ भारतीय भाषांमधील निवडक साहित्य, एका सुंदर शेल्फवर.",
        "छापील पुस्तके घरपोच, आणि डिजिटल आवृत्त्या लगेच तुमच्या लायब्ररीत.",
        "मराठी, हिंदी आणि इंग्रजीत सहज वापरता येणारा अनुभव.",
      ],
    },
    hi: {
      intro:
        "ज्ञानम् भारतीय भाषाओं की किताबें, ई-पुस्तकें और पत्रिकाएँ एक ही मंच पर लाता है।",
      points: [
        "11 भारतीय भाषाओं का चुना हुआ साहित्य, एक सुंदर शेल्फ पर।",
        "छपी किताबें घर तक, और डिजिटल संस्करण तुरंत आपकी लाइब्रेरी में।",
        "मराठी, हिंदी और अंग्रेज़ी में आसान अनुभव।",
      ],
    },
    en: {
      intro:
        "Dnyanam brings books, e-books and magazines in Indian languages together on one beautiful shelf.",
      points: [
        "Curated literature across 11 Indian languages.",
        "Print books delivered home; digital editions unlocked instantly.",
        "A smooth experience in Marathi, Hindi and English.",
      ],
    },
  },
  contact: {
    mr: {
      intro: "काही प्रश्न आहेत? आमची टीम तुमच्या मदतीसाठी तयार आहे.",
      points: [
        "ईमेल: support@dnyanam.in",
        "सोमवार ते शनिवार, सकाळी १० ते सायंकाळी ६.",
        "ऑर्डर क्रमांकासह संपर्क केल्यास आम्ही लवकर मदत करू शकतो.",
      ],
    },
    hi: {
      intro: "कोई सवाल है? हमारी टीम आपकी मदद के लिए तैयार है।",
      points: [
        "ईमेल: support@dnyanam.in",
        "सोमवार से शनिवार, सुबह 10 से शाम 6 बजे तक।",
        "ऑर्डर नंबर के साथ संपर्क करें ताकि हम जल्दी मदद कर सकें।",
      ],
    },
    en: {
      intro: "Have a question? Our team is here to help.",
      points: [
        "Email: support@dnyanam.in",
        "Monday to Saturday, 10am to 6pm IST.",
        "Include your order reference so we can help you faster.",
      ],
    },
  },
  privacy: {
    mr: {
      intro:
        "तुमची माहिती आमच्यासाठी महत्त्वाची आहे. आम्ही फक्त ऑर्डर पूर्ण करण्यासाठी आवश्यक तीच माहिती गोळा करतो.",
      points: [
        "पेमेंटची माहिती Razorpay द्वारे सुरक्षितपणे हाताळली जाते.",
        "डिजिटल फाइल्स खाजगी स्टोरेजमध्ये ठेवली जाते आणि फक्त खरेदीदारास मिळते.",
        "आम्ही तुमची वैयक्तिक माहिती विकत नाही किंवा भाड्याने देत नाही.",
      ],
    },
    hi: {
      intro:
        "आपकी जानकारी हमारे लिए महत्वपूर्ण है। हम केवल ऑर्डर पूरा करने के लिए ज़रूरी जानकारी ही लेते हैं।",
      points: [
        "भुगतान की जानकारी Razorpay द्वारा सुरक्षित रूप से संभाली जाती है।",
        "डिजिटल फ़ाइलें निजी स्टोरेज में रहती हैं और केवल खरीदार को मिलती हैं।",
        "हम आपकी व्यक्तिगत जानकारी न बेचते हैं न किराए पर देते हैं।",
      ],
    },
    en: {
      intro:
        "Your information matters. We collect only what is needed to fulfil your order and keep your library secure.",
      points: [
        "Payments are handled securely by Razorpay.",
        "Digital files live in private storage and are served only to the buyer.",
        "We never sell or rent your personal information.",
      ],
    },
  },
  terms: {
    mr: {
      intro:
        "ज्ञानम् वापरण्यासाठी हे सोपे अटी आहेत. खरेदी करून तुम्ही या अटींशी सहमत होता.",
      points: [
        "डिजिटल खरेदी वैयक्तिक वापरासाठी आहे; पुनर्विक्री किंवा वाटपासाठी नाही.",
        "किंमती आणि उपलब्धता बदलू शकतात.",
        "दुरुपयोग आढळल्यास खाते बंद केले जाऊ शकते.",
      ],
    },
    hi: {
      intro:
        "ज्ञानम् का उपयोग करना आसान है। खरीदारी करके आप इन शर्तों से सहमत होते हैं।",
      points: [
        "डिजिटल खरीद व्यक्तिगत उपयोग के लिए है; पुनर्विक्रय या साझा करने के लिए नहीं।",
        "कीमतें और उपलब्धता बदल सकती हैं।",
        "दुरुपयोग पाए जाने पर खाता बंद किया जा सकता है।",
      ],
    },
    en: {
      intro:
        "Using Dnyanam is simple. By making a purchase you agree to these terms.",
      points: [
        "Digital purchases are for personal use and may not be resold or shared.",
        "Prices and availability can change.",
        "Accounts may be closed in case of misuse.",
      ],
    },
  },
  returns: {
    mr: {
      intro:
        "छापील पुस्तकांसाठी सुरक्षित पॅकेजिंग आणि सोपी परतावा प्रक्रिया आम्ही देतो.",
      points: [
        "खराब किंवा चुकीचे पुस्तक आले असल्यास ७ दिवसांत कळवा.",
        "डिजिटल पुस्तकांची विक्री झाल्यानंतर परतावा होत नाही.",
        "परताव्यासाठी support@dnyanam.in वर ऑर्डर क्रमांक पाठवा.",
      ],
    },
    hi: {
      intro:
        "छपी किताबों के लिए सुरक्षित पैकेजिंग और आसान वापसी प्रक्रिया।",
      points: [
        "क्षतिग्रस्त या गलत किताब मिलने पर 7 दिनों में बताएं।",
        "डिजिटल किताबों की बिक्री के बाद वापसी नहीं होती।",
        "वापसी के लिए support@dnyanam.in पर ऑर्डर नंबर भेजें।",
      ],
    },
    en: {
      intro: "Safe packaging and a simple return process for print books.",
      points: [
        "Report damaged or incorrect books within 7 days.",
        "Digital purchases are non-refundable once delivered.",
        "Email support@dnyanam.in with your order reference.",
      ],
    },
  },
  faq: {
    mr: {
      intro: "ज्ञानम् वापरताना येणाऱ्या सामान्य प्रश्नांची उत्तरे.",
      points: [
        "डिजिटल पुस्तक खरेदी केल्यावर लगेच 'माझी लायब्ररी' मध्ये दिसते.",
        "छापील पुस्तके २–४ कामकाजाच्या दिवसांत पाठवली जातात.",
        "₹४९९ पेक्षा जास्त ऑर्डरवर डिलिव्हरी मोफत आहे.",
      ],
    },
    hi: {
      intro: "ज्ञानम् का उपयोग करते समय आम सवालों के जवाब।",
      points: [
        "डिजिटल किताब खरीदते ही 'मेरी लाइब्रेरी' में दिखती है।",
        "छपी किताबें 2–4 कार्य दिवसों में भेजी जाती हैं।",
        "₹499 से अधिक के ऑर्डर पर डिलीवरी मुफ़्त है।",
      ],
    },
    en: {
      intro: "Answers to common questions about shopping with Dnyanam.",
      points: [
        "Digital books appear in My Library as soon as payment succeeds.",
        "Print books are dispatched within 2–4 working days.",
        "Delivery is free on orders above ₹499.",
      ],
    },
  },
};

function isInfoSlug(value: string): value is InfoSlug {
  return (slugs as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isInfoSlug(slug)) return { title: "Dnyanam" };
  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);
  const titles: Record<InfoSlug, string> = {
    about: t("footer.about"),
    contact: t("footer.contact"),
    privacy: t("footer.privacy"),
    terms: t("footer.terms"),
    returns: t("footer.returns"),
    faq: t("footer.faq"),
  };
  return { title: titles[slug] };
}

export default async function InfoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isInfoSlug(slug)) notFound();

  const { locale } = await getServerLocale();
  const { t } = getServerI18n(locale);
  const titles: Record<InfoSlug, string> = {
    about: t("footer.about"),
    contact: t("footer.contact"),
    privacy: t("footer.privacy"),
    terms: t("footer.terms"),
    returns: t("footer.returns"),
    faq: t("footer.faq"),
  };
  const Icon = icons[slug];
  const content = copy[slug][locale];

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white/40 transition hover:text-cream"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("item.backToHome")}
        </Link>

        <div className="surface mt-5 overflow-hidden px-6 py-9 sm:px-10 sm:py-11">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-saffron-400/25 bg-saffron-400/10">
            <Icon className="h-5 w-5 text-saffron-400" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold text-cream">
            {titles[slug]}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            {content.intro}
          </p>
          <ul className="mt-6 space-y-3">
            {content.points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm leading-relaxed text-white/60"
              >
                <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-saffron-400/80" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/browse" className="btn-primary">
              {t("home.browseAll")}
            </Link>
            <Link href="/info/contact" className="btn-secondary">
              {t("footer.contact")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
