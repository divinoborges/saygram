"use client";

import React, { useState } from "react";

interface LogsProps {
  messages: unknown[];
}

const Logs: React.FC<LogsProps> = ({ messages }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 left-4 z-30">
      <md-icon-button
        onClick={() => setIsOpen(true)}
        aria-label="Open logs"
        title="Open logs"
      >
        <span className="material-symbols-outlined">code</span>
      </md-icon-button>

      <div
        className={`fixed top-0 left-0 h-screen transform transition-transform ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          width: "350px",
          background: "var(--md-sys-color-surface-container-high)",
          color: "var(--md-sys-color-on-surface)",
          boxShadow: isOpen ? "var(--md-sys-elevation-level-2)" : "none",
          transitionDuration: "var(--md-sys-motion-duration-medium-2)",
        }}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2
              style={{
                font: "var(--md-sys-typescale-title-medium-font)",
                color: "var(--md-sys-color-on-surface)",
                margin: 0,
              }}
            >
              Logs
            </h2>
            <md-icon-button
              onClick={() => setIsOpen(false)}
              aria-label="Close logs"
            >
              <span className="material-symbols-outlined">close</span>
            </md-icon-button>
          </div>
          <div className="flex-1 overflow-auto">
            <pre
              style={{
                font: "var(--md-sys-typescale-body-small-font)",
                fontFamily: "var(--md-ref-typeface-mono)",
                color: "var(--md-sys-color-on-surface-variant)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {messages.map((message, index) => (
                <div key={index} className="mb-2">
                  {JSON.stringify(message, null, 2)}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;
