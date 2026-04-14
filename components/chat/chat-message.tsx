"use client";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant" | "system" | "data";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div
      className={`flex gap-3 ${
        role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {role === "assistant" && (
        <Avatar className="h-8 w-8 border border-primary/30 shrink-0">
          <AvatarFallback className="bg-primary/15 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
      )}
      <Card
        className={`max-w-[85%] p-4 ${
          role === "user"
            ? "bg-primary text-primary-foreground border-none"
            : "bg-card border-border"
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
        </div>
      </Card>
    </div>
  );
}
