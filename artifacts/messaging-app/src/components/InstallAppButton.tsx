import { useState } from "react";
import { Download, X, Share } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

export function InstallAppButton() {
  const { hasPrompt, showBanner, isIOS, isInstalled, promptInstall, dismiss } =
    useInstallPrompt();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleClick = async () => {
    if (hasPrompt) {
      await promptInstall();
    } else {
      setPopoverOpen(true);
    }
  };

  if (isInstalled) return null;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={handleClick}
          className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
          title="Download / Install app"
        >
          <Download className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Install Connect</h4>
          {hasPrompt ? (
            <p className="text-sm text-muted-foreground">
              Click the button below to install the app on your device.
            </p>
          ) : isIOS ? (
            <p className="text-sm text-muted-foreground">
              Tap <Share className="w-4 h-4 inline" /> Share, then &quot;Add to
              Home Screen&quot; to install.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Use your browser menu (⋮ or ⋯) and select &quot;Install Connect&quot;
              or &quot;Add to Home Screen&quot; when available. For the install option
              to appear, use the production site over HTTPS.
            </p>
          )}
          {hasPrompt && (
            <button
              onClick={() => {
                promptInstall();
                setPopoverOpen(false);
              }}
              className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Install now
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Banner shown in sidebar when install is available (native prompt or iOS) */
export function InstallAppBanner() {
  const { showBanner, isIOS, hasPrompt, promptInstall, dismiss } =
    useInstallPrompt();

  if (!showBanner) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2">
      <span className="text-xs text-foreground flex-1">
        {isIOS ? "Add to Home Screen" : "Install app"}
      </span>
      {isIOS ? (
        <span className="text-[10px] text-muted-foreground truncate">
          Share <Share className="w-3 h-3 inline" /> → Add to Home Screen
        </span>
      ) : (
        <button
          onClick={() => promptInstall()}
          className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title="Install Connect app"
        >
          <Download className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={dismiss}
        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
