import Markdown from "react-markdown";
import { Bot } from "lucide-react";
import { markdownComponents } from "@/lib/markdown";
import { getWikiMarkdown, getAiDocsBlob } from "@/lib/devtools";
import { CopyForAi } from "@/components/devtools/copy-for-ai";

// Server component: reads the wiki .md at request time and renders it with the
// shared site markdown styling, plus a "Building with AI?" callout pointing at
// the copy button and the raw /devtools/llms.txt endpoint.
export async function Wiki() {
  const [md, aiBlob] = await Promise.all([getWikiMarkdown(), getAiDocsBlob()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">Building with AI?</p>
            <p className="text-sm text-muted-foreground">
              Copy these docs as context, or point your assistant at{" "}
              <a
                href="/devtools/llms.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                /devtools/llms.txt
              </a>
              .
            </p>
          </div>
        </div>
        <CopyForAi blob={aiBlob} />
      </div>

      <div className="prose prose-gray max-w-none dark:prose-invert">
        <Markdown components={markdownComponents}>{md}</Markdown>
      </div>
    </div>
  );
}
