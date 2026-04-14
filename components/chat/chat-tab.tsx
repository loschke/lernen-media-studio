"use client";

import { useState, Fragment } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, CopyIcon, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { ChatIntents } from "./chat-intents";

export function ChatTab() {
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");

  const handleSubmit = (message: PromptInputMessage | { text: string }) => {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
    setInput("");
  };

  const handleIntent = (message: string) => {
    sendMessage({ text: message });
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Reset button — only visible when chat has messages */}
      {!isEmpty && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="absolute top-3 right-4 z-10 h-8 gap-1.5 bg-card/90 backdrop-blur-sm text-muted-foreground hover:text-foreground"
          title="Chat zurücksetzen"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Neuer Chat
        </Button>
      )}

      {/* Conversation fills full width — scrollbar at window edge */}
      <Conversation className="flex-1">
        <ConversationContent className="gap-5 max-w-3xl mx-auto w-full px-4 md:px-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8 py-12">
              <div className="space-y-3">
                <div className="rounded-full bg-primary/15 text-primary p-5 mx-auto w-fit">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  Wie kann ich dir helfen?
                </h2>
                <p className="font-serif italic text-base text-muted-foreground max-w-md mx-auto">
                  Wähle einen Startpunkt oder stelle direkt eine Frage.
                </p>
              </div>
              <ChatIntents onSelect={handleIntent} />
            </div>
          ) : (
            messages.map((m, i) => (
              <Fragment key={m.id}>
                <Message from={m.role}>
                  {m.role === "assistant" && (
                    <Avatar className="h-7 w-7 border border-primary/30 shrink-0">
                      <AvatarFallback className="bg-primary/15 text-primary">
                        <Sparkles className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <MessageContent>
                    {m.parts?.map((part, j) => {
                      if (part.type === "text") {
                        return (
                          <MessageResponse key={`${m.id}-${j}`}>
                            {part.text}
                          </MessageResponse>
                        );
                      }
                      return null;
                    })}
                  </MessageContent>
                </Message>
                {m.role === "assistant" && i === messages.length - 1 && (
                  <MessageActions>
                    <MessageAction
                      onClick={() => {
                        const text =
                          m.parts
                            ?.filter(
                              (p): p is { type: "text"; text: string } =>
                                p.type === "text"
                            )
                            .map((p) => p.text)
                            .join("") || "";
                        navigator.clipboard.writeText(text);
                      }}
                      label="Kopieren"
                    >
                      <CopyIcon className="size-3" />
                    </MessageAction>
                  </MessageActions>
                )}
              </Fragment>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input — centered, always visible */}
      <div className="shrink-0 max-w-3xl mx-auto w-full px-4 md:px-6 py-4">
        <PromptInput onSubmit={handleSubmit} className="w-full relative">
          <PromptInputTextarea
            value={input}
            placeholder={
              isEmpty
                ? "Oder schreibe deine Frage direkt hier..."
                : "Antworte oder frage weiter..."
            }
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit({ text: input });
              }
            }}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status === "streaming" ? "streaming" : "ready"}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </PromptInput>
      </div>
    </div>
  );
}
