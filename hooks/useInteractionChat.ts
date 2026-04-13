import { useState, useCallback } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useInteractionChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [interactionId, setInteractionId] = useState<string | null>(null);

  // Einfaches lokales Caching der interaction_id
  // Wird client-seitig initialisiert
  const initializeInteractionState = useCallback(() => {
    const savedId = localStorage.getItem("gemini_interaction_id");
    if (savedId) {
      setInteractionId(savedId);
    }
    // Wir könnten hier auch Nachrichten aus dem localStorage laden, aber
    // für eine saubere Demo halten wir die UI-Nachrichten zur Laufzeit im Speicher.
  }, []);

  const clearChat = () => {
    localStorage.removeItem("gemini_interaction_id");
    setInteractionId(null);
    setMessages([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    const assistantMessagePlaceholder: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "" };

    const currentInput = input;
    setInput("");
    setMessages((prev) => [...prev, userMessage, assistantMessagePlaceholder]);
    setIsLoading(true);

    try {
      const savedInteractionId = localStorage.getItem("gemini_interaction_id");

      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: currentInput,
          previous_interaction_id: savedInteractionId,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunkString = decoder.decode(value, { stream: true });
          const messages = chunkString.split("\n\n").filter(Boolean);

          for (const message of messages) {
            if (message.startsWith("data: ")) {
              try {
                const data = JSON.parse(message.replace("data: ", ""));
                if (data.type === "text") {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const last = newMessages[newMessages.length - 1];
                    last.content += data.content;
                    return newMessages;
                  });
                } else if (data.type === "complete" && data.interactionId) {
                  localStorage.setItem("gemini_interaction_id", String(data.interactionId));
                  setInteractionId(String(data.interactionId));
                }
              } catch (e) {
                console.warn("Error parsing chunk", message);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      // Entferne den Error Message Placeholder
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = "Es ist ein Fehler aufgetreten.";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    clearChat,
    interactionId,
    initializeInteractionState,
  };
}
