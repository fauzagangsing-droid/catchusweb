"use client";

import { useMobileMenu } from "@/hooks/useMobileMenu";

export default function Navbar() {
  const { menuActive, toggleMenu } = useMobileMenu();

  return (
    <div className="navbar">
      <div className="container">
        <div className="navbar-box">
          <div className="logo">
            <h1>Catchus</h1>
          </div>
          <ul className={`menu${menuActive ? " menu-active" : ""}`}>
            <li>
              <a href="#beranda">Beranda</a>
            </li>
            <li>
              <a href="#layanan">Layanan</a>
            </li>
            <li>
              <a href="#produk">Product</a>
            </li>
            <li>
              <a href="#kontak">Kontak</a>
            </li>
          </ul>

          {/* menumen */}
          <i className="ri-menu-3-line ri-2x" onClick={toggleMenu}></i>
        </div>
      </div>
    </div>
  );
}
