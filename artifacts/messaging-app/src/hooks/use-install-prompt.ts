import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALL_DISMISSED_KEY = "connect-install-dismissed";

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
    setDismissed(wasDismissed);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setHasPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setHasPrompt(false);
      setInstallPrompt(null);
      return true;
    }
    return false;
  };

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(INSTALL_DISMISSED_KEY, "1");
  };

  const showBanner = !isInstalled && !dismissed && (hasPrompt || isIOS);

  return {
    hasPrompt,
    showBanner,
    isIOS,
    isInstalled,
    promptInstall,
    dismiss,
  };
}
