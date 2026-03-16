"use client";

import { useState, useEffect } from "react";

export function useKeyboardHeight(): { keyboardVisible: boolean; keyboardHeight: number } {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function onResize() {
      const diff = window.innerHeight - (vv?.height ?? window.innerHeight);
      setKeyboardHeight(diff > 150 ? diff : 0);
    }

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  return { keyboardVisible: keyboardHeight > 0, keyboardHeight };
}
