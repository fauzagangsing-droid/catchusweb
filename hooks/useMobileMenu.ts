"use client";

import { useEffect, useState } from "react";

/**
 * Replicates the original script.js behavior exactly:
 *
 *   const menumen = document.querySelector(".ri-menu-3-line");
 *   const menu = document.querySelector(".menu");
 *   menumen.addEventListener("click", () => {
 *       menu.classList.toggle("menu-active");
 *   });
 *   window.onscroll = () => {
 *       menu.classList.remove("menu-active");
 *   };
 *
 * Note: the original CSS also defines a `.navbar.on-scroll` style, but no
 * script in the original project ever adds that class - it's unused dead
 * CSS in the source project. To stay faithful to current behavior, this
 * hook does NOT add that class either.
 */
export function useMobileMenu() {
  const [menuActive, setMenuActive] = useState(false);

  const toggleMenu = () => setMenuActive((prev) => !prev);

  useEffect(() => {
    const handleScroll = () => setMenuActive(false);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { menuActive, toggleMenu };
}
