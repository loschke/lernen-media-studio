"use client";

import { useEffect, useRef } from "react";
import { useInteractionChat } from "@/hooks/useInteractionChat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SendHorizontal, RotateCcw, Image as ImageIcon, Video, Mic } from "lucide-react";

export default function MediaStudio() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, clearChat, interactionId, initializeInteractionState } = useInteractionChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeInteractionState();
  }, [initializeInteractionState]);

  useEffect(() => {
    // Auto-Scroll nach unten bei neuen Nachrichten
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTo({ top: scrollElement.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Gemini Media Studio</h1>
            <p className="text-sm text-muted-foreground">
              Interactions API Demo {interactionId && <span className="text-xs ml-2 opacity-50 bg-secondary px-2 rounded">State: {interactionId.substring(0, 8)}...</span>}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={clearChat} title="Konversation zurücksetzen">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="flex flex-col gap-6 pb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground space-y-4">
                <div className="rounded-full bg-secondary p-4">
                  <Video className="h-8 w-8 opacity-50" />
                </div>
                <p>Nutze die Interactions API. Sende eine Nachricht, um zu starten.</p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}
                  <Card className={`max-w-[80%] p-3 ${m.role === "user" ? "bg-primary text-primary-foreground border-none" : "bg-muted"}`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {m.content || (isLoading && idx === messages.length - 1 ? <span className="animate-pulse">Gemini tippt...</span> : "")}
                    </div>
                  </Card>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-background/50 backdrop-blur">
          <form className="relative flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <div className="flex flex-col gap-2 relative">
               {/* Media Actions (Mock für UI) */}
               <div className="flex gap-1">
                 <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Bild anhängen">
                   <ImageIcon className="h-4 w-4" />
                 </Button>
                 <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Audio aufnehmen">
                   <Mic className="h-4 w-4" />
                 </Button>
                 <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Video anhängen">
                   <Video className="h-4 w-4" />
                 </Button>
               </div>
            </div>
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              placeholder="Frage etwas oder lade Medien hoch..."
              className="resize-none min-h-[60px] max-h-[200px] flex-1 bg-background"
              rows={1}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-[60px] w-[60px] shrink-0 rounded-xl">
              <SendHorizontal className="h-5 w-5" />
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
