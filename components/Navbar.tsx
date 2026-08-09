"use client";

import { useMobileMenu } from "@/hooks/useMobileMenu";
import ProductSearch from "@/components/ProductSearch";
import CustomerAuthNav from "@/components/auth/CustomerAuthNav";
import CartBadge from "@/components/cart/CartBadge";

interface NavbarProps {
  brandName: string;
  logoUrl?: string | null;
}

export default function Navbar({ brandName, logoUrl }: NavbarProps) {
  const { menuActive, toggleMenu } = useMobileMenu();

  return (
    <div className="navbar">
      <div className="container">
        <div className="navbar-box">
          <div className="logo">
            {logoUrl ? (
              // Admin-configured logos may use any trusted public host, which
              // cannot be known ahead of time for next/image allow-listing.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`${brandName} official logo`} />
            ) : (
              <span className="brand-name">{brandName}</span>
            )}
          </div>
          <ProductSearch />
          <ul className={`menu${menuActive ? " menu-active" : ""}`}>
            <li>
              <a href="/#beranda">Beranda</a>
            </li>
            <li>
              <a href="/#layanan">Layanan</a>
            </li>
            <li>
              <a href="/#produk">Product</a>
            </li>
            <li>
              <a href="/#kontak">Kontak</a>
            </li>
            <li className="cart-nav-item">
              <CartBadge />
            </li>
            <CustomerAuthNav />
          </ul>

          <i className="ri-menu-3-line ri-2x" onClick={toggleMenu}></i>
        </div>
      </div>
    </div>
  );
}
