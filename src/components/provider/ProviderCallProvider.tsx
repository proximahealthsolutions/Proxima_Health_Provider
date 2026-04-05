"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { fetchApi } from "@/lib/api";

type OutgoingCallHandlers = {
  onAccepted?: () => void;
  onRejected?: () => void;
  onDeclined?: () => void;
  onTimeout?: () => void;
  onCanceled?: () => void;
};

type ProviderCallContextValue = {
  ensureZego: () => Promise<{ zp: any; zego: any }>;
  setOutgoingHandlers: (handlers: OutgoingCallHandlers | null) => void;
};

const ProviderCallContext = createContext<ProviderCallContextValue | null>(null);

export function ProviderCallProvider({ children }: { children: React.ReactNode }) {
  const zegoRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const outgoingHandlersRef = useRef<OutgoingCallHandlers | null>(null);
  const callContainerRef = useRef<HTMLDivElement | null>(null);
  const [callVisible, setCallVisible] = useState(false);
  const audioUnlockedRef = useRef(false);
  const [showSoundBanner, setShowSoundBanner] = useState(true);
  const [soundModalVisible, setSoundModalVisible] = useState(false);
  const soundStorageKey = "provider-call-sound-enabled";

  const setOutgoingHandlers = useCallback((handlers: OutgoingCallHandlers | null) => {
    outgoingHandlersRef.current = handlers;
  }, []);

  const ensureZego = useCallback(async () => {
    if (zegoRef.current) return zegoRef.current;
    const tokenResp = await fetchApi("/messages/zego-token");
    if (!tokenResp?.token || !tokenResp?.appId || !tokenResp?.userId) {
      throw new Error(tokenResp?.message || "Unable to get ZEGOCLOUD token.");
    }
    const zego = (await import("@zegocloud/zego-uikit-prebuilt")) as any;
    const { ZIM } = (await import("zego-zim-web")) as any;

    const kitToken = zego.ZegoUIKitPrebuilt.generateKitTokenForProduction(
      tokenResp.appId,
      tokenResp.token,
      "",
      tokenResp.userId,
      tokenResp.userName,
    );

    const zp = zego.ZegoUIKitPrebuilt.create(kitToken);
    zp.addPlugins({ ZIM });
    zp.setCallInvitationConfig({
      endCallWhenInitiatorLeave: true,
      ringtoneConfig: {
        outgoingCallUrl: "/sound/call.mp3",
        incomingCallUrl: "/sound/ringing.mp3",
      },
      onSetRoomConfigBeforeJoining: () => {
        setCallVisible(true);
        return { container: callContainerRef.current };
      },
      onOutgoingCallAccepted: () => outgoingHandlersRef.current?.onAccepted?.(),
      onOutgoingCallRejected: () => outgoingHandlersRef.current?.onRejected?.(),
      onOutgoingCallDeclined: () => outgoingHandlersRef.current?.onDeclined?.(),
      onOutgoingCallTimeout: () => outgoingHandlersRef.current?.onTimeout?.(),
      onCallInvitationEnded: (reason: string) => {
        setCallVisible(false);
        if (reason === "Canceled") {
          outgoingHandlersRef.current?.onCanceled?.();
        }
      },
    });
    zegoRef.current = { zp, zego };
    return zegoRef.current;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(soundStorageKey);
    if (saved === "true") {
      audioUnlockedRef.current = true;
      setShowSoundBanner(false);
    }
  }, []);

  useEffect(() => {
    if (showSoundBanner) return;
    ensureZego().catch((err) => {
      console.error("Zego init failed", err);
    });
  }, [ensureZego, showSoundBanner]);

  useEffect(() => {
    if (showSoundBanner) {
      setSoundModalVisible(true);
    }
  }, [showSoundBanner]);

  const attemptUnlock = useCallback(async () => {
    if (audioUnlockedRef.current) return true;
    try {
      const AudioContextClass =
        typeof window !== "undefined"
          ? window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          : undefined;

      if (AudioContextClass) {
        const context = new AudioContextClass();
        await context.resume();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        gain.gain.value = 0;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.01);
      }

      const audio = document.createElement("audio");
      audio.src =
        "data:audio/mp3;base64,SUQzAwAAAAAAFlRFTkMAAAADAAADTGF2ZjU2LjI0LjEwNAAAAAAAAAAAAAAA//uQxAADBzQAPAAAGkAAAAIAAANIAAAAAExBTUUzLjk4LjIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
      audio.muted = true;
      audio.setAttribute("playsinline", "true");
      await audio.play().catch(() => undefined);
      audio.pause();

      audioUnlockedRef.current = true;
      setShowSoundBanner(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(soundStorageKey, "true");
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? "https://proxima-health-backend.onrender.com";
    const socket = io(`${wsUrl}/messages`, {
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
      randomizationFactor: 0.3,
    });
    socketRef.current = socket;

    const joinAppointments = async () => {
      try {
        const appts = await fetchApi("/providers/appointments");
        const rows = Array.isArray(appts) ? appts : [];
        const appointmentIds = rows
          .filter((appt: any) =>
            ["ACCEPTED", "IN_PROGRESS", "ENDED_BY_PROVIDER"].includes(appt.status)
          )
          .map((appt: any) => appt.id)
          .filter(Boolean);
        appointmentIds.forEach((appointmentId: string) => {
          socket.emit("join", { appointmentId });
        });
      } catch (err) {
        console.error("presence join failed", err);
      }
    };

    socket.on("connect", joinAppointments);
    joinAppointments();

    return () => {
      socket.off("connect", joinAppointments);
      socket.disconnect();
    };
  }, []);

  return (
    <ProviderCallContext.Provider value={{ ensureZego, setOutgoingHandlers }}>
      {children}
      {showSoundBanner && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
          <div
            className={
              "absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-500 " +
              (soundModalVisible ? "opacity-100" : "opacity-0")
            }
          />
          <div
            className={
              "relative w-[min(92vw,560px)] rounded-3xl border border-white/10 bg-[var(--color-surface)] p-6 sm:p-8 shadow-[0_30px_80px_rgba(15,23,42,0.55)] transition-all duration-500 " +
              (soundModalVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-[0.98]")
            }
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18" />
                  <path d="M8 7.5v9" />
                  <path d="M16 7.5v9" />
                  <path d="M4 10.5v3" />
                  <path d="M20 10.5v3" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
                  Sound Required
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">
                  Enable call sound
                </h3>
                <p className="mt-2 text-sm text-[var(--color-text-muted)] leading-relaxed">
                  We need permission to play ringing and call tones so you never miss a session.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-on-primary)] shadow-[0_10px_25px_rgba(59,130,246,0.35)] transition-transform duration-200 hover:-translate-y-0.5"
                onClick={() => attemptUnlock()}
              >
                Enable sound
              </button>
              <div className="text-xs text-[var(--color-text-muted)] text-center sm:text-left">
                This prompt closes only after sound is enabled.
              </div>
            </div>
          </div>
        </div>
      )}
      <div
        className={
          "fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm transition-opacity " +
          (callVisible ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        <div ref={callContainerRef} className="w-full h-full" />
      </div>
    </ProviderCallContext.Provider>
  );
}

export function useProviderCall() {
  const context = useContext(ProviderCallContext);
  if (!context) {
    return {
      ensureZego: async () => ({ zp: null, zego: null }),
      setOutgoingHandlers: () => {},
    };
  }
  return context;
}

