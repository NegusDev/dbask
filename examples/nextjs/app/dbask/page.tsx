"use client";
import { useRef, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function DbAskPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loading = status === "loading";
  const canSubmit = question.trim().length > 0 && !loading;

  async function askDatabase(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setAnswer("");
    setCopied(false);

    try {
      const response = await fetch("/api/dbask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setAnswer(data.answer);
      setStatus("success");
    } catch (error) {
      setAnswer(
        error instanceof Error ? error.message : "Failed to query database."
      );
      setStatus("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      askDatabase(e as unknown as React.FormEvent);
    }
  }

  function applySuggestion(text: string) {
    setQuestion(text);
    textareaRef.current?.focus();
  }

  function clearAll() {
    setQuestion("");
    setAnswer("");
    setStatus("idle");
    textareaRef.current?.focus();
  }

  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  const suggestions = [
    "How many students enrolled this term?",
    "Show the top 5 products by revenue this month",
    "Which classes have the highest attendance rate?",
  ];

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Database connected
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Ask your database
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Ask questions in plain English — we&apos;ll query your business
            data and return the answer.
          </p>
        </header>

        <form onSubmit={askDatabase} className="space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. How many students enrolled this term?"
              rows={4}
              disabled={loading}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white p-4 pr-16 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-gray-200 dark:focus:ring-white/10 dark:disabled:bg-gray-900/50 dark:disabled:text-gray-400"
            />
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              ⌘ + ↵
            </span>
          </div>

          {question.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {question.trim()
                ? `${question.trim().length} chars`
                : "Be specific for best results"}
            </span>
            <div className="flex items-center gap-2">
              {(question || answer) && (
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={loading}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Thinking…
                  </>
                ) : (
                  <>
                    Ask database
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {(status === "loading" || status === "success" || status === "error") && (
          <section
            aria-live="polite"
            className={
              "mt-8 overflow-hidden rounded-xl border transition " +
              (status === "error"
                ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900")
            }
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-gray-800">
              <span
                className={
                  "flex items-center gap-2 text-xs font-medium uppercase tracking-wide " +
                  (status === "error"
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-500 dark:text-gray-400")
                }
              >
                {status === "loading" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />}
                {status === "success" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                {status === "error" && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                {status === "loading" ? "Querying" : status === "success" ? "Answer" : "Error"}
              </span>

              {status === "success" && answer && (
                <button
                  onClick={copyAnswer}
                  className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              )}
            </div>

            <div className="p-5">
              {status === "loading" ? (
                <div className="space-y-2.5">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                </div>
              ) : (
                <p
                  className={
                    "whitespace-pre-wrap text-sm leading-relaxed " +
                    (status === "error"
                      ? "text-red-700 dark:text-red-300"
                      : "text-gray-800 dark:text-gray-200")
                  }
                >
                  {answer}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
