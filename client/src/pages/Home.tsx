import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SESSION_KEY = "webchat_session_id";
const CONVERSATION_KEY = "webchat_conversation_id";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const created = nanoid();
    localStorage.setItem(SESSION_KEY, created);
    return created;
  }, []);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedConversation = localStorage.getItem(CONVERSATION_KEY);
    if (storedConversation) {
      const parsed = Number(storedConversation);
      if (!Number.isNaN(parsed)) {
        setConversationId(parsed);
      }
    }
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    if (!sessionId) {
      setError("Missing session id. Refresh the page.");
      return;
    }

    const outgoing = input.trim();
    setInput("");
    setError(null);
    setSending(true);
    setMessages(prev => [...prev, { role: "user", content: outgoing }]);

    try {
      const response = await fetch("/api/webchat/message", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: outgoing,
          sessionId,
          conversationId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to send message.");
      }

      if (data?.conversationId) {
        setConversationId(data.conversationId);
        localStorage.setItem(CONVERSATION_KEY, String(data.conversationId));
      }

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.reply || "No response received." },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_60%)] text-slate-900">
      <main className="container py-10 md:py-16">
        <header className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            African Language Chatbot
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 md:text-5xl">
            Ready to deploy on webchat, WhatsApp, Telegram, or Discord.
          </h1>
          <p className="mt-4 text-base text-slate-600 md:text-lg">
            This demo uses the built-in webchat endpoint. Configure a channel
            webhook to go live in WhatsApp, Telegram, or Discord.
          </p>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-sm text-slate-500">Webchat</p>
                <p className="text-lg font-semibold text-slate-900">
                  Live conversation
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                {sending ? "Sending" : "Online"}
              </span>
            </div>

            <div
              ref={listRef}
              className="h-[420px] overflow-y-auto px-6 py-5"
            >
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Start a conversation by sending a message. Replies will appear
                  here.
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          message.role === "user"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              {error && (
                <p className="mb-3 text-sm text-rose-600">{error}</p>
              )}
              <div className="flex gap-3">
                <input
                  className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                  placeholder="Type your message..."
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button
                  type="button"
                  disabled={sending}
                  onClick={sendMessage}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900">
              Channel checklist
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Pick a channel and set the matching environment variables.
            </p>
            <div className="mt-5 space-y-4 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-semibold">WhatsApp</p>
                <p className="text-slate-500">
                  Configure webhook secret, verify token, phone number id, and
                  access token.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-semibold">Telegram</p>
                <p className="text-slate-500">
                  Set bot token and optional webhook secret.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-semibold">Discord</p>
                <p className="text-slate-500">
                  Register the `/chat` command and configure the public key.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
