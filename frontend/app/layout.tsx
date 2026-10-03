import '../styles/globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Oraczen Deal Desk',
  description: 'Quote preparation and approval simulator'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="shell topbar-inner">
            <Link href="/" className="brand">
              <span className="brand-mark">O</span>
              <span>
                <strong>Oraczen</strong>
                <small>Deal Desk</small>
              </span>
            </Link>
            <nav className="nav-links">
              <Link href="/">Quote Builder</Link>
              <Link href="/quotes">Saved Quotes</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
