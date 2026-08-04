// Barrel re-export for @pt/tooling.
//
// @pt/tooling ships adapter *interfaces* with in-memory stubs. Phase
// C and Phase D swap in concrete adapters; selection is driven by env
// at boot time, and `selectAdapters()` below is the entry-point.
//
// Consumers:
//   - @pt/api imports `defaultAudioAdapter`, `defaultConversationAdapter`,
//     `defaultAudioRecorder`, and the corresponding types.
//   - @pt/web imports `AudioRecorder` only (to type-check Phase C's
//     web recorder adapter that replaces the stub).

export * from './audio.js';
export * from './conversation.js';
export * from './recorder.js';

import { defaultAudioAdapter, type AudioSynthesisAdapter } from './audio.js';
import {
  defaultConversationAdapter,
  type ConversationAdapter,
} from './conversation.js';
import { defaultAudioRecorder, type AudioRecorder } from './recorder.js';

export interface AdapterSelection {
  readonly audio: AudioSynthesisAdapter;
  readonly conversation: ConversationAdapter;
  readonly audioRecorder: AudioRecorder;
}

export interface AdapterSelectionEnv {
  /** Stub selector — Phase A leaves this undefined; Phase C reads AUDIO_PROVIDER. */
  readonly AUDIO_PROVIDER?: 'stub:pt-PT:memory' | 'azure:pt-PT:default' | 'polly:Ines' | 'minimax:pt-PT:default';
  /** Stub selector — Phase A leaves this undefined; Phase D reads CONVERSATION_PROVIDER. */
  readonly CONVERSATION_PROVIDER?: 'stub:scripted' | 'minimax:structured' | 'openai:structured';
  /** Stub selector — Phase A leaves this undefined; Phase C reads RECORDER_PROVIDER. */
  readonly RECORDER_PROVIDER?: 'stub:no-op' | 'web:mediarecorder' | 'android:capacitor';
}

/**
 * Selects adapter implementations from the boot-time env. Phase A
 * always returns the in-memory stubs. Phase C/D replace this with
 * concrete provider selectors — the selection shape does not change.
 */
export function selectAdapters(env: AdapterSelectionEnv = {}): AdapterSelection {
  void env;
  return {
    audio: defaultAudioAdapter,
    conversation: defaultConversationAdapter,
    audioRecorder: defaultAudioRecorder,
  };
}

export { defaultAudioAdapter, defaultConversationAdapter, defaultAudioRecorder };