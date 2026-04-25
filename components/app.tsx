"use client";

import ApiKeyButton from "@/components/api-key-button";
import ApiKeyDialog, { type DialogReason } from "@/components/api-key-dialog";
import CodeSidePanel from "@/components/code-side-panel";
import DiagramCanvas from "@/components/diagram-canvas";
import Logs from "@/components/logs";
import StatusBar, { SessionStatus } from "@/components/status-bar";
import ToastHost from "@/components/toast-host";
import { useEffect, useRef, useState, useCallback } from "react";
import { apiKeyStore, getStoredKey, useStoredKey } from "@/lib/api-key";
import { buildInstructions, TOOLS, VOICE } from "@/lib/config";
import {
  MODEL,
  REALTIME_CALLS_URL,
  REALTIME_CLIENT_SECRETS_URL,
} from "@/lib/constants";
import { diagramStore, useDiagramCode } from "@/lib/diagram-store";
import { dispatchDiagramTool } from "@/lib/diagram-tools";
import {
  PANEL_COLLAPSED_WIDTH,
  panelState,
  panelWidthState,
  usePanelResizing,
  usePanelState,
  usePanelWidth,
} from "@/lib/panel-state";
import { applyM3Theme, DEFAULT_SEED } from "@/lib/m3-theme";
import { resolveScheme } from "@/lib/theme-pref";
import "@/lib/m3-elements";

type RealtimeClientSecret = {
  value: string;
  expires_at: number;
  session?: {
    id?: string;
  };
};

export default function App() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [logs, setLogs] = useState<any[]>([]);
  const diagramCode = useDiagramCode();
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<SessionStatus>("disconnected");

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const audioTransceiver = useRef<RTCRtpTransceiver | null>(null);
  const tracks = useRef<RTCRtpSender[] | null>(null);

  const storedKey = useStoredKey();
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [apiKeyDialogReason, setApiKeyDialogReason] =
    useState<DialogReason>("manual");

  // Hydrate the diagram, panel, and API key state from localStorage on mount.
  useEffect(() => {
    diagramStore.hydrate();
    panelState.hydrate();
    panelWidthState.hydrate();
    apiKeyStore.hydrate();
  }, []);

  // Apply the M3 token palette on mount and re-apply when the OS scheme flips.
  useEffect(() => {
    const refresh = () => applyM3Theme(DEFAULT_SEED, resolveScheme());
    refresh();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", refresh);
    return () => mq.removeEventListener("change", refresh);
  }, []);

  const panel = usePanelState();
  const panelCollapsed = panel === "collapsed";
  const panelWidth = usePanelWidth();
  const isPanelResizing = usePanelResizing();

  // Start a new realtime session
  async function startSession() {
    let pc: RTCPeerConnection | null = null;
    let stream: MediaStream | null = null;

    try {
      if (!isSessionStarted) {
        setIsSessionStarted(true);
        setStatus("connecting");

        const userKey = getStoredKey();
        if (!userKey) {
          setIsSessionStarted(false);
          setStatus("disconnected");
          setApiKeyDialogReason("no_key");
          setApiKeyDialogOpen(true);
          return;
        }

        const sessionResponse = await fetch(REALTIME_CLIENT_SECRETS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expires_after: { anchor: "created_at", seconds: 600 },
            session: {
              type: "realtime",
              model: MODEL,
              audio: { output: { voice: VOICE } },
            },
          }),
          cache: "no-store",
        });

        if (sessionResponse.status === 401) {
          setIsSessionStarted(false);
          setStatus("disconnected");
          setApiKeyDialogReason("invalid_key");
          setApiKeyDialogOpen(true);
          return;
        }

        if (!sessionResponse.ok) {
          throw new Error(await sessionResponse.text());
        }

        const session: RealtimeClientSecret = await sessionResponse.json();
        const sessionToken = session.value;
        const sessionId = session.session?.id;

        if (!sessionToken) {
          throw new Error(
            "Realtime client secret is missing from OpenAI response",
          );
        }

        if (sessionId) {
          console.log("Session id:", sessionId);
        }

        // Create a peer connection
        pc = new RTCPeerConnection();
        const activePeerConnection = pc;

        // Set up to play remote audio from the model
        if (!audioElement.current) {
          audioElement.current = document.createElement("audio");
        }
        audioElement.current.autoplay = true;
        activePeerConnection.ontrack = (e) => {
          if (audioElement.current) {
            audioElement.current.srcObject = e.streams[0];
          }
        };

        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const activeStream = stream;
        setAudioStream(activeStream);

        activeStream.getTracks().forEach((track) => {
          const sender = activePeerConnection.addTrack(track, activeStream);
          if (sender) {
            tracks.current = [...(tracks.current || []), sender];
          }
        });

        // Set up data channel for sending and receiving events
        const dc = activePeerConnection.createDataChannel("oai-events");
        setDataChannel(dc);

        // Start the session using the Session Description Protocol (SDP)
        const offer = await activePeerConnection.createOffer();
        await activePeerConnection.setLocalDescription(offer);

        const sdpResponse = await fetch(REALTIME_CALLS_URL, {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/sdp",
          },
        });

        if (!sdpResponse.ok) {
          throw new Error(await sdpResponse.text());
        }

        const answer: RTCSessionDescriptionInit = {
          type: "answer",
          sdp: await sdpResponse.text(),
        };
        await activePeerConnection.setRemoteDescription(answer);

        peerConnection.current = activePeerConnection;
      }
    } catch (error) {
      console.error("Error starting session:", error);
      stream?.getTracks().forEach((track) => track.stop());
      pc?.close();
      tracks.current = null;
      setAudioStream(null);
      setDataChannel(null);
      setIsSessionStarted(false);
      setIsSessionActive(false);
      setIsListening(false);
      setStatus("error");
    }
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionStarted(false);
    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    setAudioStream(null);
    setIsListening(false);
    setStatus("disconnected");
    audioTransceiver.current = null;
    tracks.current = null;
    if (audioElement.current) {
      audioElement.current.srcObject = null;
    }
  }

  // Grabs a new mic track and replaces the placeholder track in the transceiver
  async function startRecording() {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setAudioStream(newStream);

      // If we already have an audioSender, just replace its track:
      if (tracks.current) {
        const micTrack = newStream.getAudioTracks()[0];
        tracks.current.forEach((sender) => {
          sender.replaceTrack(micTrack);
        });
      } else if (peerConnection.current) {
        // Fallback if audioSender somehow didn't get set
        newStream.getTracks().forEach((track) => {
          const sender = peerConnection.current?.addTrack(track, newStream);
          if (sender) {
            tracks.current = [...(tracks.current || []), sender];
          }
        });
      }

      setIsListening(true);
      console.log("Microphone started.");
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }

  // Replaces the mic track with a placeholder track
  function stopRecording() {
    setIsListening(false);

    // Stop existing mic tracks so the user’s mic is off
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    setAudioStream(null);

    // Replace with a placeholder (silent) track
    if (tracks.current) {
      const placeholderTrack = createEmptyAudioTrack();
      tracks.current.forEach((sender) => {
        sender.replaceTrack(placeholderTrack);
      });
    }
  }

  // Creates a placeholder track that is silent
  function createEmptyAudioTrack(): MediaStreamTrack {
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    return destination.stream.getAudioTracks()[0];
  }

  // Send a message to the model
  const sendClientEvent = useCallback(
    (message: any) => {
      if (dataChannel?.readyState === "open") {
        message.event_id = message.event_id || crypto.randomUUID();
        dataChannel.send(JSON.stringify(message));
      } else {
        console.error(
          "Failed to send message - no data channel available",
          message
        );
      }
    },
    [dataChannel]
  );

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    async function handleToolCall(output: any) {
      console.log("Tool call:", { name: output.name, arguments: output.arguments });

      const result = await dispatchDiagramTool(output.name, output.arguments);
      const toolCallOutput = result ?? {
        ok: false,
        error: `Unknown tool: ${output.name}`,
        mermaid_code: diagramStore.getCurrent(),
      };

      if (toolCallOutput.ok) {
        setParseError(null);
      } else if (toolCallOutput.error) {
        setParseError(toolCallOutput.error);
      }

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: output.call_id,
          output: JSON.stringify(toolCallOutput),
        },
      });

      // Tool calls don't auto-trigger a response in Realtime; nudge the model
      // to react (e.g. confirm aloud, or retry on failure) after each call.
      sendClientEvent({ type: "response.create" });
    }

    if (dataChannel) {
      const handleMessage = (e: MessageEvent) => {
        const event = JSON.parse(e.data);

        if (event.type === "error") {
          console.error("Realtime error:", event);
          setLogs((prev) => [event, ...prev]);
          setStatus("error");
          return;
        }

        if (event.type === "output_audio_buffer.started") {
          setStatus("model_speaking");
          return;
        }

        if (
          event.type === "output_audio_buffer.stopped" ||
          event.type === "output_audio_buffer.cleared"
        ) {
          setStatus((prev) => (prev === "model_speaking" ? "listening" : prev));
          return;
        }

        if (event.type === "response.done") {
          const outputs = event.response?.output ?? [];
          const functionCall = outputs.find(
            (output: any) => output?.type === "function_call"
          );

          if (outputs.length > 0) {
            setLogs((prev) => [...outputs, ...prev]);
          }

          if (functionCall) {
            void handleToolCall(functionCall);
          }
        }
      };

      const handleOpen = () => {
        setIsSessionActive(true);
        setIsListening(true);
        setStatus("listening");
        setLogs([]);

        const sessionUpdate = {
          type: "session.update",
          session: {
            type: "realtime",
            tools: TOOLS,
            instructions: buildInstructions(diagramStore.getCurrent()),
          },
        };

        sendClientEvent(sessionUpdate);
        console.log("Session update sent:", sessionUpdate);
      };

      // Append new server events to the list
      dataChannel.addEventListener("message", handleMessage);

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", handleOpen);

      return () => {
        dataChannel.removeEventListener("message", handleMessage);
        dataChannel.removeEventListener("open", handleOpen);
      };
    }
  }, [dataChannel, sendClientEvent]);

  const handleConnectClick = async () => {
    if (isSessionActive) {
      console.log("Stopping session.");
      stopSession();
    } else {
      console.log("Starting session.");
      startSession();
    }
  };

  const handleMicToggleClick = async () => {
    if (!isSessionActive) return;

    if (isListening) {
      console.log("Stopping microphone.");
      stopRecording();
    } else {
      console.log("Starting microphone.");
      startRecording();
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative size-full">
      <div
        className={`absolute top-0 left-0 h-full ${
          isPanelResizing ? "" : "transition-[right] duration-200 ease-out"
        }`}
        style={{
          right: panelCollapsed ? PANEL_COLLAPSED_WIDTH : panelWidth,
        }}
      >
        <DiagramCanvas code={diagramCode} parseError={parseError} />
        <div className="absolute top-4 right-4 z-30">
          <ApiKeyButton
            showRequiredBadge={!storedKey}
            onClick={() => {
              setApiKeyDialogReason("manual");
              setApiKeyDialogOpen(true);
            }}
          />
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
          <StatusBar
            status={status}
            isListening={isListening}
            onStartStopClick={handleConnectClick}
            onMicToggleClick={handleMicToggleClick}
          />
        </div>
      </div>
      <CodeSidePanel
        code={diagramCode}
        collapsed={panelCollapsed}
        onToggle={() => panelState.toggle()}
        onChange={(value) => diagramStore.commit(value)}
      />
      <Logs messages={logs} />
      <ApiKeyDialog
        open={apiKeyDialogOpen}
        reason={apiKeyDialogReason}
        onClose={() => setApiKeyDialogOpen(false)}
      />
      <ToastHost />
    </div>
  );
}
