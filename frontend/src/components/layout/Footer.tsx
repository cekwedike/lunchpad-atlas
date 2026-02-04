'use client';

import Link from 'next/link';
import { Trophy, Mail, Linkedin, Twitter, Github } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-atlas-navy">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-atlas-navy">ATLAS</span>
            </Link>
            <p className="mt-4 text-sm text-gray-600 max-w-md">
              Accelerating Talent for Leadership & Success - THRiVE Hub LaunchPad 
              Fellowship empowering African youth for global opportunities.
            </p>
            <div className="mt-6 flex gap-4">
              <a
                href="https://linkedin.com/company/thrive-hub"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-atlas-navy transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com/thrivehub"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-atlas-navy transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/thrive-hub"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-atlas-navy transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="mailto:info@thrivehub.org"
                className="text-gray-600 hover:text-atlas-navy transition-colors"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Quick Links</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-600 hover:text-atlas-navy transition-colors"
                >
                  About ATLAS
                </Link>
              </li>
              <li>
                <Link
                  href="/resources"
                  className="text-sm text-gray-600 hover:text-atlas-navy transition-colors"
                >
                  Resources
                </Link>
              </li>
              <li>
                <Link
                  href="/leaderboard"
                  className="text-sm text-gray-600 hover:text-atlas-navy transition-colors"
                >
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link
                  href="/discussions"
                  className="text-sm text-gray-600 hover:text-atlas-navy transition-colors"
                >
                  Discussions
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Support</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/help"
                  className="text-sm text-gray-600 hover:text-atlas-navy transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-600 hover:text-atlas-navy transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-600 hover:text-atlas-navy transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-600 hover:text-atlas-navy transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <p className="text-center text-sm text-gray-600">
            © {currentYear} THRiVE Hub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
