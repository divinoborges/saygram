"use client";

export type SessionStatus =
  | "disconnected"
  | "connecting"
  | "listening"
  | "model_speaking"
  | "error";

interface StatusBarProps {
  status: SessionStatus;
  isListening: boolean;
  onStartStopClick: () => void;
  onMicToggleClick: () => void;
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting…",
  listening: "Listening",
  model_speaking: "Model speaking",
  error: "Error",
};

// Per the design, each session state maps to an M3 semantic-color pair
// (container background + on-container foreground) sourced from the token CSS
// variables. These show up as inline custom properties on <md-assist-chip>.
const STATUS_TOKENS: Record<
  SessionStatus,
  { container: string; on: string; pulse: boolean }
> = {
  disconnected: {
    container: "var(--md-sys-color-surface-container-high)",
    on: "var(--md-sys-color-on-surface-variant)",
    pulse: false,
  },
  connecting: {
    container: "var(--md-sys-color-tertiary-container)",
    on: "var(--md-sys-color-on-tertiary-container)",
    pulse: true,
  },
  listening: {
    container: "var(--md-sys-color-primary-container)",
    on: "var(--md-sys-color-on-primary-container)",
    pulse: false,
  },
  model_speaking: {
    container: "var(--md-sys-color-secondary-container)",
    on: "var(--md-sys-color-on-secondary-container)",
    pulse: true,
  },
  error: {
    container: "var(--md-sys-color-error-container)",
    on: "var(--md-sys-color-on-error-container)",
    pulse: false,
  },
};

export default function StatusBar({
  status,
  isListening,
  onStartStopClick,
  onMicToggleClick,
}: StatusBarProps) {
  const isConnected =
    status === "listening" || status === "model_speaking";
  const isStartable = status === "disconnected" || status === "error";
  const tokens = STATUS_TOKENS[status];

  const chipStyle = {
    "--md-assist-chip-container-color": tokens.container,
    "--md-assist-chip-label-text-color": tokens.on,
    "--md-assist-chip-leading-icon-color": tokens.on,
    "--md-assist-chip-outline-color": "transparent",
    "--md-assist-chip-outline-width": "0",
  } as React.CSSProperties;

  return (
    <div className="flex items-center gap-2">
      <md-assist-chip style={chipStyle} aria-label={STATUS_LABEL[status]}>
        <span
          slot="icon"
          aria-hidden="true"
          className={`size-2 ${tokens.pulse ? "animate-pulse" : ""}`}
          style={{
            background: tokens.on,
            borderRadius: "var(--md-sys-shape-corner-full)",
            display: "inline-block",
          }}
        />
        {STATUS_LABEL[status]}
      </md-assist-chip>

      <md-filled-tonal-icon-button
        onClick={onStartStopClick}
        aria-label={isStartable ? "Start session" : "Stop session"}
      >
        <span className="material-symbols-outlined">
          {isStartable ? "play_arrow" : "stop"}
        </span>
      </md-filled-tonal-icon-button>

      <md-filled-tonal-icon-button
        onClick={onMicToggleClick}
        disabled={!isConnected}
        aria-label={isListening ? "Mute microphone" : "Unmute microphone"}
      >
        <span className="material-symbols-outlined">
          {isListening ? "mic" : "mic_off"}
        </span>
      </md-filled-tonal-icon-button>
    </div>
  );
}
