"use client";

import { useState, Fragment, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, CopyIcon, RotateCcw, ImagePlus, X } from "lucide-react";
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
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { MAX_REF_IMAGES, MAX_UPLOAD_BYTES } from "@/lib/validation";
import { ChatIntents } from "./chat-intents";

const MAX_SIZE_LABEL = `${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`;

function ChatRefsRow() {
  const attachments = usePromptInputAttachments();
  const count = attachments.files.length;
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap px-3 py-3 border-b border-border/40">
      {attachments.files.map((f) => (
        <div
          key={f.id}
          className="relative h-14 w-14 rounded-md overflow-hidden border border-border"
        >
          {f.url && f.mediaType?.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={f.url}
              alt={f.filename ?? ""}
              className="w-full h-full object-cover"
            />
          ) : null}
          <button
            type="button"
            onClick={() => attachments.remove(f.id)}
            className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
            title="Entfernen"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {count < MAX_REF_IMAGES && (
        <button
          type="button"
          onClick={() => attachments.openFileDialog()}
          className="h-14 w-14 rounded-md border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Bild hinzufügen"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
      )}
      <p className="text-xs text-muted-foreground ml-auto">
        {count}/{MAX_REF_IMAGES}
      </p>
    </div>
  );
}

function ChatActionBar({
  status,
  hasInput,
}: {
  status: "ready" | "streaming";
  hasInput: boolean;
}) {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasInput || attachments.files.length > 0;
  const disabledAdd = attachments.files.length >= MAX_REF_IMAGES;
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-2 border-t border-border/40">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabledAdd}
        onClick={() => attachments.openFileDialog()}
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        title={
          disabledAdd
            ? `Max. ${MAX_REF_IMAGES} Bilder`
            : "Bild anhängen (max. 3, nur Bildformate)"
        }
      >
        <ImagePlus className="h-3.5 w-3.5" />
        <span className="text-xs">Bild</span>
      </Button>
      <PromptInputSubmit
        status={status}
        disabled={!canSubmit || status === "streaming"}
        className="h-8 w-8"
      />
    </div>
  );
}

function ClearAttachmentsRegister({
  registerRef,
}: {
  registerRef: (fn: () => void) => void;
}) {
  const attachments = usePromptInputAttachments();
  useEffect(() => {
    registerRef(() => attachments.clear());
  }, [attachments, registerRef]);
  return null;
}

export function ChatTab() {
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const clearAttachmentsRef = useRef<(() => void) | null>(null);

  const handleSubmit = (message: PromptInputMessage | { text: string }) => {
    const text = message.text?.trim() ?? "";
    const files = "files" in message ? message.files ?? [] : [];
    if (!text && files.length === 0) return;
    setUploadError(null);
    sendMessage({
      text,
      ...(files.length > 0 ? { files } : {}),
    });
    setInput("");
  };

  const handleIntent = (message: string) => {
    sendMessage({ text: message });
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    setUploadError(null);
    clearAttachmentsRef.current?.();
  };

  const isEmpty = messages.length === 0;
  const submitStatus: "ready" | "streaming" =
    status === "streaming" ? "streaming" : "ready";

  return (
    <div className="flex flex-col h-full w-full relative">
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
                  Wähle einen Startpunkt, lade ein Bild hoch oder stelle direkt eine Frage.
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
                    {(() => {
                      const imageParts =
                        m.parts?.filter(
                          (
                            p
                          ): p is {
                            type: "file";
                            url: string;
                            mediaType: string;
                            filename?: string;
                          } =>
                            p.type === "file" &&
                            typeof (p as { mediaType?: string }).mediaType ===
                              "string" &&
                            (p as { mediaType: string }).mediaType.startsWith(
                              "image/"
                            )
                        ) ?? [];
                      return imageParts.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {imageParts.map((p, j) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={`${m.id}-img-${j}`}
                              src={p.url}
                              alt={p.filename ?? "Anhang"}
                              className="h-24 w-24 object-cover rounded-md border border-border/60"
                            />
                          ))}
                        </div>
                      ) : null;
                    })()}
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

      <div className="shrink-0 max-w-3xl mx-auto w-full px-4 md:px-6 py-4">
        {uploadError && (
          <p className="text-xs text-destructive mb-2 px-1">{uploadError}</p>
        )}
        <PromptInput
          onSubmit={handleSubmit}
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          maxFiles={MAX_REF_IMAGES}
          maxFileSize={MAX_UPLOAD_BYTES}
          onError={(err) => {
            if (err.code === "max_files") {
              setUploadError(`Maximal ${MAX_REF_IMAGES} Bilder.`);
            } else if (err.code === "max_file_size") {
              setUploadError(`Datei zu groß (max. ${MAX_SIZE_LABEL}).`);
            } else if (err.code === "accept") {
              setUploadError("Nur Bildformate (JPEG, PNG, WebP, GIF).");
            } else {
              setUploadError(err.message);
            }
          }}
          className="w-full [&_[data-slot=input-group]]:rounded-2xl [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:focus-within:ring-0 [&_[data-slot=input-group]]:focus-within:border-primary/50"
        >
          <div data-align="block-start" className="w-full flex flex-col">
            <ChatRefsRow />
            <PromptInputTextarea
              value={input}
              placeholder={
                isEmpty
                  ? "Schreibe deine Frage — oder hänge ein Bild an (Reverse-Prompt, Stil extrahieren, Übergang beschreiben)..."
                  : "Antworte oder frage weiter..."
              }
              onChange={(e) => {
                setInput(e.currentTarget.value);
                if (uploadError) setUploadError(null);
              }}
              className="min-h-[80px] max-h-[240px] resize-none thin-scrollbar border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3"
            />
            <ChatActionBar status={submitStatus} hasInput={!!input.trim()} />
          </div>
          <ClearAttachmentsRegister
            registerRef={(fn) => {
              clearAttachmentsRef.current = fn;
            }}
          />
        </PromptInput>
      </div>
    </div>
  );
}
