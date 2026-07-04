import type { Metadata } from "next";

const supportEmail =
  process.env.NEXT_PUBLIC_ALETHEIA_SUPPORT_CONTACT_EMAIL ||
  process.env.ALETHEIA_SUPPORT_EMAIL ||
  "team@mirrortalkpodcast.com";

const supportUrl =
  process.env.NEXT_PUBLIC_ALETHEIA_SUPPORT_URL || `mailto:${supportEmail}`;

export const metadata: Metadata = {
  title: "Privacy Policy | Aletheia Companion",
  description: "Privacy Policy for Aletheia Companion.",
};

function Section({
  title,
  children,
}: Readonly<{
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef2ef_0%,#f7f4ed_100%)] px-6 py-12 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <header className="space-y-4 border-b border-slate-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Aletheia Companion</p>
          <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-700">
            Effective date: July 4, 2026
          </p>
          <p className="max-w-2xl text-sm leading-7 text-slate-700">
            This policy explains how Aletheia Companion collects, uses, shares, and protects information when you use
            the app and related services.
          </p>
        </header>

        <div className="mt-8 space-y-10">
          <Section title="Summary">
            <ul className="list-disc space-y-2 pl-5">
              <li>We use your account and app content to provide the service.</li>
              <li>We do not sell your personal data.</li>
              <li>We do not use your content for third-party advertising.</li>
              <li>You can export or delete your account data from inside the app.</li>
              <li>Some features rely on service providers, including hosting, analytics, email, notifications, and AI responses.</li>
            </ul>
          </Section>

          <Section title="Information We Collect">
            <p>
              Depending on how you use the app, we may collect name, email address, profile image or avatar,
              account/sign-in information, chat prompts and responses, journal entries, decision notes, reflections,
              shared-counsel content, manual context, support reports, preferences, device and app identifiers,
              session identifiers, push subscription tokens, app activity, notification interactions, and diagnostic
              data such as error logs and crash logs.
            </p>
          </Section>

          <Section title="How We Use Information">
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide and improve the app</li>
              <li>Create and manage accounts</li>
              <li>Sync data across devices</li>
              <li>Generate AI responses and related summaries</li>
              <li>Send notifications you opt into</li>
              <li>Respond to support requests</li>
              <li>Detect abuse, fraud, and security issues</li>
            </ul>
          </Section>

          <Section title="AI Features">
            <p>
              When you use AI-powered features, your request is processed by our server first. Our server may retrieve
              relevant app content and biblical wisdom sources, and if enabled, may send the request to OpenAI to help
              generate a response. We try to avoid sending unnecessary private content, but your prompt and relevant
              context may be processed to answer your request.
            </p>
          </Section>

          <Section title="Analytics">
            <p>
              We use first-party analytics to understand usage and improve the product. We do not intentionally store
              full private chat text, full journal text, or private rule text in analytics events.
            </p>
          </Section>

          <Section title="Sharing and Disclosure">
            <p>
              We do not sell your personal information. We may share data with service providers that help us run the
              app, or with other users only when you intentionally share content through app features such as shared
              decisions or counsel circles.
            </p>
          </Section>

          <Section title="Your Controls">
            <p>
              You can export your account data, delete your account, manage preferences, update your profile, and
              control notifications from inside the app.
            </p>
          </Section>

          <Section title="Children’s Privacy">
            <p>
              Aletheia Companion is not directed to children under 13, and we do not knowingly collect personal
              information from children under 13.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              For privacy questions or requests, contact us through the in-app support flow or by email at{" "}
              <a className="font-medium text-emerald-800 underline underline-offset-4" href={supportUrl}>
                {supportEmail}
              </a>
              .
            </p>
          </Section>
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <p>
            This page is provided for App Store Connect and Google Play listing purposes. The source policy text is
            also checked into the repository as PRIVACY_POLICY.md.
          </p>
        </footer>
      </article>
    </main>
  );
}
