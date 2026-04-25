// Minimal JSX type declarations for the @material/web custom elements we use.
// React 19 exposes JSX as a nested namespace inside the `react` module, so we
// augment that. Permissive types let us pass M3-specific attributes without
// fighting TypeScript; React 19 forwards children/events/refs to custom
// elements natively at runtime.

import type { DetailedHTMLProps, HTMLAttributes, ReactNode } from "react";

type MdProps<T extends HTMLElement = HTMLElement> = DetailedHTMLProps<
  HTMLAttributes<T>,
  T
> & {
  disabled?: boolean;
  href?: string;
  target?: string;
  type?: string;
  value?: string | number;
  name?: string;
  slot?: string;
  [attr: `data-${string}`]: string | number | boolean | undefined;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "md-filled-tonal-button": MdProps & { children?: ReactNode };
      "md-text-button": MdProps & { children?: ReactNode };
      "md-icon-button": MdProps & {
        toggle?: boolean;
        selected?: boolean;
        children?: ReactNode;
      };
      "md-filled-tonal-icon-button": MdProps & {
        toggle?: boolean;
        selected?: boolean;
        children?: ReactNode;
      };
      "md-assist-chip": MdProps & {
        label?: string;
        elevated?: boolean;
        children?: ReactNode;
      };
      "md-chip-set": MdProps & { children?: ReactNode };
      "md-icon": MdProps & { children?: ReactNode };
      "md-circular-progress": MdProps & {
        indeterminate?: boolean;
        value?: number;
        max?: number;
        "four-color"?: boolean;
      };
      "md-elevation": MdProps;
      "md-ripple": MdProps;
    }
  }
}

export {};
