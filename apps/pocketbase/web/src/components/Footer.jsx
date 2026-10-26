import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Globe, ShieldCheck } from 'lucide-react';
import { LOGOS, COMPANY } from '@/lib/brand';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services' },
  { to: '/industries', label: 'Industries' },
  { to: '/verify-certificate', label: 'Verify Certificate' },
  { to: '/contact', label: 'Contact' },
];

const serviceLinks = [
  { label: 'HSE & Safety Solutions', hash: 'hse' },
  { label: 'Professional Training', hash: 'training' },
  { label: 'ISO & Certification Support', hash: 'iso' },
  { label: 'Technical Services', hash: 'technical' },
  { label: 'Industrial Solutions', hash: 'industrial' },
  { label: 'Inspection & Compliance', hash: 'inspection' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white text-charcoal">
      <div className="h-1 bg-syn-orange" />

      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">

          <div className="lg:col-span-4">
            <Link
              to="/"
              className="inline-flex items-center"
              aria-label="SYNVOSA home"
            >
              <img
                src={LOGOS.enWide}
                alt={COMPANY.name}
                className="h-16 w-auto object-contain sm:h-20 lg:h-24"
              />
            </Link>

            <p className="mt-5 max-w-sm text-sm font-semibold leading-relaxed text-charcoal">
              {COMPANY.tagline}
            </p>

            <p className="mt-3 max-w-sm text-sm leading-relaxed text-charcoal/70">
              {COMPANY.nameAr} — Saudi-based integrated services, HSE, professional training,
              certification support, technical and industrial solutions since {COMPANY.established}.
            </p>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-syn-orange">
              Saudi Arabia · GCC · Worldwide
            </p>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-syn-orange">
              Company
            </h3>

            <ul className="mt-4 space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-charcoal/70 transition-colors hover:text-syn-orange"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-syn-orange">
              Service Divisions
            </h3>

            <ul className="mt-4 space-y-2.5">
              {serviceLinks.map((item) => (
                <li key={item.hash}>
                  <Link
                    to={`/services#${item.hash}`}
                    className="text-sm text-charcoal/70 transition-colors hover:text-syn-orange"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-syn-orange">
              Head Office
            </h3>

            <ul className="mt-4 space-y-4">

              <li className="flex gap-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-syn-orange"
                  strokeWidth={2}
                />

                <p className="text-sm leading-relaxed text-charcoal/75">
                  {COMPANY.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              </li>

              <li className="flex gap-3">
                <Mail
                  className="mt-0.5 h-4 w-4 shrink-0 text-syn-orange"
                  strokeWidth={2}
                />

                <a
                  href={`mailto:${COMPANY.email}`}
                  className="text-sm text-charcoal/75 transition-colors hover:text-syn-orange"
                >
                  {COMPANY.email}
                </a>
              </li>

              <li className="flex gap-3">
                <Globe
                  className="mt-0.5 h-4 w-4 shrink-0 text-syn-orange"
                  strokeWidth={2}
                />

                <span className="text-sm text-charcoal/75">
                  {COMPANY.website}
                </span>
              </li>

              <li>
                <Link
                  to="/verify-certificate"
                  className="inline-flex items-center gap-2 rounded-md border border-syn-orange px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-syn-orange transition-all duration-200 hover:bg-syn-orange hover:text-white"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verify Certificate
                </Link>
              </li>

            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-charcoal/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-charcoal/55">
            © {year} {COMPANY.name}. All rights reserved.
          </p>

          <img
            src={LOGOS.arWide}
            alt={COMPANY.nameAr}
            className="h-10 w-auto object-contain sm:h-12"
          />
        </div>
      </div>
    </footer>
  );
}