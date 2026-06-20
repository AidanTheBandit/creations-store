"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

// Copies the full self-contained docs blob to the clipboard so a developer can
// paste it straight into an AI coding assistant as context. The blob is built
// server-side (lib/devtools.ts) and passed in, keeping a single source of truth.
export function CopyForAi({ blob }: { blob: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(blob);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context / permissions); fail quietly.
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" /> Copied
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" /> Copy for AI
        </>
      )}
    </Button>
  );
}
