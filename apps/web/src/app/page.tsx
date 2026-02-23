import Link from "next/link";
import { ArrowRight, Store, Link2, Users, Cpu } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">FORGE</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container flex flex-col items-center gap-8 pb-16 pt-24 text-center md:pt-32">
          <div className="inline-flex items-center rounded-full border bg-muted px-4 py-1.5 text-sm font-medium">
            Open Platform for NGOs & Startups
          </div>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Build Your Organisation with{" "}
            <span className="text-primary">Modular Software</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
            FORGE lets you deploy pre-built software modules, compose them into complete solutions,
            and manage everything with AI-powered orchestration — at a fraction of the cost of
            custom development.
          </p>
          <div className="flex gap-4">
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Start for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/store"
              className="inline-flex h-11 items-center justify-center rounded-md border bg-background px-6 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Browse Modules
            </Link>
          </div>
        </section>

        {/* Three Pillars */}
        <section className="container pb-24">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="group rounded-xl border bg-card p-8 transition-shadow hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">FORGE Store</h3>
              <p className="text-muted-foreground">
                Browse a marketplace of ready-to-deploy software modules. CRM, project management,
                analytics, and more — built by developers, for your organisation.
              </p>
            </div>
            <div className="group rounded-xl border bg-card p-8 transition-shadow hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">FORGE Link</h3>
              <p className="text-muted-foreground">
                Deploy, monitor, and compose modules into unified solutions. Track resources,
                view logs, and manage your entire infrastructure from one dashboard.
              </p>
            </div>
            <div className="group rounded-xl border bg-card p-8 transition-shadow hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">FORGE Hub</h3>
              <p className="text-muted-foreground">
                A collaborative platform for developers to publish, showcase, and monetize their
                modules. Contribute to the ecosystem and earn from your work.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Cpu className="h-4 w-4" />
            <span>FORGE — Framework for Organisational Resource Governance and Efficiency</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for NGOs and Startups
          </p>
        </div>
      </footer>
    </div>
  );
}
