"use client";

import { useEffect } from "react";
import AOS from "aos";

/**
 * Replaces the original inline script:
 *   <script src="https://unpkg.com/aos@next/dist/aos.js"></script>
 *   <script>AOS.init();</script>
 *
 * Uses the npm `aos` package instead of the CDN script, initialized once
 * on mount. Renders nothing - side-effect only.
 */
export default function AosInit() {
  useEffect(() => {
    AOS.init();
  }, []);

  return null;
}
