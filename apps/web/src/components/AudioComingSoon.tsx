// AudioComingSoon — Phase B placeholder for the Shadow audio panel.
//
// Per CONTEXT.md "Pre-Phase C Audio", the Shadow stage surfaces
// a "coming soon" empty state instead of failing when
// `cv_sentence_versions.audio_id` is NULL. Phase C back-fills
// audio rows and replaces this component with the real
// `<audio>` element. The `role="status"` + `aria-live="polite"`
// pairing surfaces the message to assistive tech without
// interrupting the practice flow.

export default function AudioComingSoon() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ border: '1px dashed #999', padding: '0.75rem' }}
    >
      <p>
        <strong>Audio playback coming soon.</strong>
      </p>
      <p>
        Reviewed European Portuguese audio will play here once Phase C ships.
        You can still record and self-rate.
      </p>
    </div>
  );
}