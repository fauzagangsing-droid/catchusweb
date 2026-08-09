"use client";

import { useEffect } from "react";
import AOS from "aos";

/** Initializes the AOS library once on the client; this component renders no UI. */
export default function AosInit() {
  useEffect(() => {
    AOS.init();
  }, []);

  return null;
}
