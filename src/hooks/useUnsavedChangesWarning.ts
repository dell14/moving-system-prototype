"use client";

import { useEffect } from "react";

type UseUnsavedChangesWarningOptions = {
  isEnabled: boolean;
  message?: string;
};

const defaultMessage =
  "Are you sure you want to leave? Your changes will be lost.";

export function useUnsavedChangesWarning({
  isEnabled,
  message = defaultMessage,
}: UseUnsavedChangesWarningOptions): void {
  useEffect(() => {
    if (!isEnabled) return undefined;

    let allowHistoryNavigation = false;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!anchor.href) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(anchor.href, window.location.href);
      const isSamePage =
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash;

      if (isSamePage) return;

      const shouldLeave = window.confirm(message);
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handlePopState = () => {
      if (allowHistoryNavigation) {
        allowHistoryNavigation = false;
        return;
      }

      const shouldLeave = window.confirm(message);
      if (shouldLeave) {
        allowHistoryNavigation = true;
        window.history.back();
        return;
      }

      window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isEnabled, message]);
}
