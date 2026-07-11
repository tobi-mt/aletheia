import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type ManagedAudioState = "idle" | "loading" | "playing" | "paused" | "stopped" | "ended" | "error";

export type ManagedAudioProgressEvent = {
  progress: number;
};

export type ManagedAudioStateEvent = {
  state: ManagedAudioState;
};

export type ManagedAudioSpeakOptions = {
  text: string;
  voice: string;
  language: string;
  speed?: number;
  notice?: string;
  label?: string;
  cacheScope?: "scripture";
};

export interface ManagedAudioPlugin {
  speak(options: ManagedAudioSpeakOptions): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  addListener(eventName: "progress", listenerFunc: (event: ManagedAudioProgressEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "state", listenerFunc: (event: ManagedAudioStateEvent) => void): Promise<PluginListenerHandle>;
}

export const ManagedAudio = registerPlugin<ManagedAudioPlugin>("ManagedAudio");
