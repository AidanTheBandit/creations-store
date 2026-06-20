import type { Components } from "react-markdown";

// Shared react-markdown component overrides. Used by the creation detail page
// (app/[...slug]/page.tsx) and the dev tools wiki so prose renders identically
// across the site. Pairs with the `prose prose-gray dark:prose-invert` wrapper.
export const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="my-4 leading-relaxed text-muted-foreground">{children}</p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline underline-offset-4"
    >
      {children}
    </a>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 text-xl font-semibold text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-lg font-semibold text-foreground">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="my-4 ml-6 list-disc text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 ml-6 list-decimal text-muted-foreground">{children}</ol>
  ),
  // Code: inline spans get a subtle chip; fenced blocks are left to the parent
  // <pre> (styled via the prose-pre:* classes on craft.tsx's wrappers).
  code: ({ className, children }) => {
    const isBlock = (className || "").includes("language-");
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-md border bg-muted/25 p-4 text-sm text-foreground">
      {children}
    </pre>
  ),
};
