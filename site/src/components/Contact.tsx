import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { CONTACT_TABS } from "../config";
import { useContactIntake } from "../lib/contactIntake";

export default function Contact() {
  const c = useContactIntake();
  return (
    <section id="contact" className="section-contact" aria-label="Contact">
      <div className="container">
        <div className="contact-ai contact-ai--compact">
          <div className="contact-ai-intro">
            <h3 className="contact-ai-title">Contact</h3>
            <p className="contact-ai-pills-hint muted" id="contact-ai-pills-hint" role="note">
              Simple contact—pick a topic and write a short note.
            </p>
            <div
              className="contact-ai-pills"
              role="group"
              aria-label="Contact topic"
              aria-describedby="contact-ai-pills-hint"
            >
              {CONTACT_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`contact-ai-pill${c.tab === id ? " contact-ai-pill--active" : ""}`}
                  data-value={id}
                  disabled={c.busy}
                  onClick={() => c.applyTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`contact-ai-body contact-ai-body--draft${c.inPreview ? " contact-ai-body--preview" : ""}`}
            id="contact-ai-body"
          >
            <div className="contact-ai-step1-stack">
              <div className="contact-ai-composer" id="contact-ai-composer">
                {c.showComposer && (
                  <div className="contact-ai-composer-row">
                    <label className="contact-ai-composer-label" htmlFor="contact-ai-input">
                      <span className="visually-hidden">Message</span>
                      <textarea
                        id="contact-ai-input"
                        className="contact-ai-input form-control"
                        rows={2}
                        placeholder={c.placeholder}
                        title="Your message"
                        autoComplete="off"
                        aria-multiline="true"
                        disabled={c.busy}
                        value={c.message}
                        onChange={(e) => c.setMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            c.onSubmit();
                          }
                        }}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      className="btn ghost contact-ai-send"
                      id="contact-ai-send"
                      disabled={!c.canSendMessage || !c.canSubmitPreview}
                      onClick={c.onSubmit}
                    >
                      Next
                    </Button>
                  </div>
                )}

                <div className="contact-ai-window">
                  {c.showPreview && (
                    <div
                      id="contact-ai-preview-block"
                      className="contact-ai-preview-block contact-ai-preview-block--in-window"
                      aria-label="Preview email"
                    >
                      <p className="contact-ai-section-label muted">Preview</p>
                      <p className="contact-ai-preview-edit-hint" role="note">
                        Edit the draft if needed, then add your email address.
                      </p>
                      <textarea
                        className="contact-ai-preview-pre form-control"
                        id="contact-ai-preview-pre"
                        rows={10}
                        spellCheck
                        aria-label="Editable email preview"
                        value={c.preview}
                        onChange={(e) => c.setPreview(e.target.value)}
                      />
                    </div>
                  )}

                  {c.status.text && (
                    <p
                      className="contact-ai-status muted"
                      id="contact-ai-status"
                      role="status"
                      data-kind={c.status.kind || undefined}
                    >
                      {c.status.text}
                    </p>
                  )}

                  {c.progress.visible && (
                    <div
                      id="contact-ai-progress-panel"
                      className="contact-ai-progress"
                      data-kind={c.progress.kind}
                    >
                      <p className="contact-ai-progress-text" id="contact-ai-progress-text">
                        {c.progress.text}
                      </p>
                      {c.progress.showFirstNote && (
                        <p className="contact-ai-progress-note muted" id="contact-ai-progress-note">
                          First message can take a bit longer while the server wakes up.
                        </p>
                      )}
                    </div>
                  )}

                  {c.sent && (
                    <div id="contact-ai-sent-block" className="contact-ai-sent-block">
                      <p className="contact-ai-sent-lede" id="contact-ai-sent-lede">
                        {c.sent.lede}
                      </p>
                      <div
                        className="contact-ai-sent-preview contact-ai-preview-pre"
                        id="contact-ai-sent-preview"
                        role="region"
                        aria-label="Email content that was sent"
                      >
                        {c.sent.body}
                      </div>
                    </div>
                  )}
                </div>

                {c.showHint && (
                  <p
                    className="contact-ai-preview-mail-hint contact-ai-preview-mail-hint--panel contact-ai-preview-mail-hint--compact"
                    id="contact-ai-preview-mail-hint"
                    role="note"
                  >
                    Draft email appears here.
                  </p>
                )}
              </div>
            </div>

            {c.showEmailPanel && (
              <div id="contact-ai-email-panel" className="contact-ai-email-panel" aria-label="Send inquiry to inbox">
                <div className="contact-ai-structured-actions" id="contact-ai-structured-actions">
                  <label className="contact-ai-reply-label" htmlFor="contact-reply-email">
                    <span className="contact-ai-section-label muted">Your email</span>
                    <Form.Control
                      type="email"
                      id="contact-reply-email"
                      className="contact-ai-input contact-ai-reply-email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      value={c.replyEmail}
                      onChange={(e) => c.setReplyEmail(e.target.value)}
                    />
                  </label>
                  {c.deliveryWarning && (
                    <p className="contact-ai-delivery-warning muted" id="contact-delivery-warning">
                      {c.deliveryWarning}
                    </p>
                  )}
                  <div className="contact-ai-send-primary-wrap">
                    <Button
                      type="button"
                      className="btn main contact-ai-send-structured"
                      id="contact-ai-send-structured"
                      disabled={!c.sendEnabled || c.busy}
                      onClick={c.onSendInquiry}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!c.sent && (
            <p className="contact-ai-bottom-email contact-ai-bottom-email--compact" id="contact-ai-bottom-email" role="note">
              <span className="contact-ai-direct-email contact-ai-direct-email--inline">
                <a href="mailto:contact@ana-stanojevic.com?subject=Reaching%20out%20via%20your%20site">Email directly</a>
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
