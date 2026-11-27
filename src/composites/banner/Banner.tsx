// A banner: a line of news across the top of a pane or page (a conflict, a lost connection, a refused edit), drawn in
// its tone, with the app's actions at its end and, if the app lets it go, a close button. An error is an alert, so a
// screen reader reads it at once; every other tone is a status, read when the reader is free. A tone it does not know
// is drawn neutrally.
import type { ComponentPropsWithRef, ReactNode } from "react";
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
  return (
    <div
      {...rest}
      role={tone === "err" ? "alert" : "status"}
      className={className === undefined ? "pb-banner" : `pb-banner ${className}`}
      data-tone={tone}
    >
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
