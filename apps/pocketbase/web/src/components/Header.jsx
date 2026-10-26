import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, ShieldCheck, LogIn } from 'lucide-react';
import { LOGOS } from '@/lib/brand';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services' },
  { to: '/industries', label: 'Industries' },
  { to: '/verify-certificate', label: 'Verify Certificate', accent: true },
  { to: '/contact', label: 'Contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl border-b border-black/10 shadow-lg shadow-black/5'
          : 'bg-white/80 backdrop-blur-xl border-b border-black/10'
      }`}
    >
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="flex h-[5rem] lg:h-[5.75rem] items-center justify-between gap-4">

          <Link
            to="/"
            className="flex shrink-0 items-center py-2"
            aria-label="SYNVOSA home"
          >
            <img
              src={LOGOS.enWide}
              alt="SYNVOSA Integrated Company"
              className="hidden h-14 w-auto object-contain sm:block lg:h-16"
            />

            <img
              src={LOGOS.symbol}
              alt="SYNVOSA"
              className="h-12 w-auto object-contain sm:hidden"
            />
          </Link>

          <nav className="hidden xl:flex items-center gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `relative px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-200 ${
                    link.accent
                      ? 'text-syn-orange hover:text-clay-dark'
                      : isActive
                        ? 'text-charcoal'
                        : 'text-charcoal/70 hover:text-charcoal'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      {link.accent && (
                        <ShieldCheck
                          className="h-3.5 w-3.5"
                          strokeWidth={2.25}
                        />
                      )}
                      {link.label}
                    </span>

                    {(isActive || link.accent) && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-syn-orange" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">

            <a
              href="https://portal.synvosa.com"
              className="hidden lg:inline-flex items-center gap-2 rounded-md border border-charcoal/20 bg-white/40 backdrop-blur-md px-4 lg:px-5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-charcoal transition-all duration-200 hover:border-syn-orange hover:text-syn-orange"
            >
              <LogIn className="h-3.5 w-3.5" strokeWidth={2.25} />
              Employee Login
            </a>

            <Link
              to="/contact"
              className="hidden md:inline-flex items-center gap-2 rounded-md bg-syn-orange px-4 lg:px-5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white transition-all duration-200 hover:bg-clay-dark active:scale-[0.98]"
            >
              Get in Touch
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="xl:hidden inline-flex h-11 w-11 items-center justify-center rounded-md border border-charcoal/20 bg-white/40 backdrop-blur-md text-charcoal"
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

          </div>
        </div>
      </div>

      {open && (
        <nav className="xl:hidden border-t border-black/10 bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5">
          <div className="mx-auto max-w-[90rem] px-4 py-4 flex flex-col gap-1">

            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `rounded-md px-4 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] ${
                    link.accent
                      ? 'text-syn-orange bg-syn-orange/5'
                      : isActive
                        ? 'bg-black/5 text-charcoal'
                        : 'text-charcoal/80'
                  }`
                }
              >
                <span className="inline-flex items-center gap-2">
                  {link.accent && (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {link.label}
                </span>
              </NavLink>
            ))}

            <a
              href="https://portal.synvosa.com"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-md border border-charcoal/20 bg-white/50 px-4 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-charcoal"
            >
              <LogIn className="h-4 w-4" />
              Employee Login
            </a>

            <Link
              to="/contact"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-syn-orange px-4 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            >
              Get in Touch
              <ArrowRight className="h-4 w-4" />
            </Link>

          </div>
        </nav>
      )}
    </header>
  );
}