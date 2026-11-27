// A banner: a line of news across the top of a pane or page (a conflict, a lost connection, a refused edit), drawn in
// its tone, with the app's actions at its end and, if the app lets it go, a close button. Its words are read through
// two hidden live regions inside it, there before the words (docs/ux-rules.md#feedback, U42): an error's in the alert,
// read at once, every other tone's in the status, read when the reader is free. A tone it does not know is drawn
// neutrally.
import { type ComponentPropsWithRef, type ReactNode, useEffect, useState } from "react";
import { IconButton } from "../../primitives";
import "./Banner.css";

/** The tones a banner draws; any other string is drawn neutrally. */
export type BannerTone = "ok" | "warn" | "err" | "quiet" | "off" | "accent" | "muted" | (string & {});

/** The banner's own words, each replaceable. */
export interface BannerLabels {
  /** The close button's name: "Dismiss". */
  dismiss: string;
}

export const defaultBannerLabels: BannerLabels = {
  dismiss: "Dismiss",
};

export type BannerProps = Omit<ComponentPropsWithRef<"div">, "role"> & {
  /** What the news is, by colour: the stripe's, and the surface's for warn and err. */
  tone: BannerTone;
  /** The news, in words. */
  children: ReactNode;
  /** A slot at the end: the buttons that act on the news. */
  actions?: ReactNode;
  /** Shows a close button, which asks the app to take the banner away. */
  onDismiss?: () => void;
  /** Words to replace; the rest keep their defaults. */
  labels?: Partial<BannerLabels>;
};

export function Banner({ tone, children, actions, onDismiss, labels, className, ...rest }: BannerProps) {
  const words = { ...defaultBannerLabels, ...labels };
  // The regions are drawn empty in the banner's first commit and take its words in the next, so a banner mounted with
  // its words is read; after that its words follow its children and its tone (a tone that turns to err moves them to
  // the alert, which reads them at once).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Set from an effect on purpose: the words must reach the regions in a commit after the regions are there.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const alert = tone === "err";
  return (
    <div {...rest} className={className === undefined ? "pb-banner" : `pb-banner ${className}`} data-tone={tone}>
      <div className="pb-banner-announce">
        <div role="status">{mounted && !alert && children}</div>
        <div role="alert">{mounted && alert && children}</div>
      </div>
      <div className="pb-banner-text">{children}</div>
      {actions !== undefined && <div className="pb-banner-actions">{actions}</div>}
      {onDismiss !== undefined && (
        <IconButton className="pb-banner-dismiss" size="sm" label={words.dismiss} onClick={onDismiss}>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        </IconButton>
      )}
    </div>
  );
}
