// Next Imports
import { notFound } from "next/navigation";
import Link from "next/link";
import Balancer from "react-wrap-balancer";

// Database Imports
import { getBookmarkBySlug, incrementBookmarkViews } from "@/lib/data";

// Component Imports
import { Section, Container } from "@/components/craft";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, AppWindow, User, Eye } from "lucide-react";

// Metadata
import { Metadata, ResolvingMetadata } from "next";
import Markdown from "react-markdown";

type Props = {
  params: { slug: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const bookmark = await getBookmarkBySlug(params.slug);

  if (!bookmark) {
    notFound();
  }

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${bookmark.title} | Directory`,
    description:
      bookmark.description ||
      bookmark.overview ||
      `A curated bookmark from Directory`,
    openGraph: {
      title: bookmark.title,
      description: bookmark.description || bookmark.overview || undefined,
      url: bookmark.url,
      images: [
        ...(bookmark.ogImage ? [bookmark.ogImage] : []),
        ...previousImages,
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: bookmark.title,
      description: bookmark.description || bookmark.overview || undefined,
      images: bookmark.ogImage ? [bookmark.ogImage] : [],
    },
  };
}

export default async function Page({ params }: Props) {
  const bookmark = await getBookmarkBySlug(params.slug);

  if (!bookmark) {
    notFound();
  }

  // Increment views in the background
  incrementBookmarkViews(bookmark.id).catch(console.error);

  return (
    <Section>
      <Container>
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Back Navigation */}
          <div>
            <Button variant="ghost" size="sm" className="gap-2" asChild>
              <Link href="/">
                <ExternalLink className="h-4 w-4 rotate-180" />
                Back to Creations
              </Link>
            </Button>
          </div>

          {/* App Store Style Header */}
          <div className="space-y-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              {/* App Icon */}
              <div className="flex-shrink-0">
                <div className="group relative">
                  {bookmark.favicon ? (
                    <img
                      src={bookmark.favicon}
                      alt={`${bookmark.title} icon`}
                      width={128}
                      height={128}
                      className="h-32 w-32 rounded-3xl border-4 border-background shadow-xl transition-transform group-hover:scale-105"
                    />
                  ) : bookmark.ogImage ? (
                    <img
                      src={bookmark.ogImage}
                      alt={`${bookmark.title} preview`}
                      width={128}
                      height={128}
                      className="h-32 w-32 rounded-3xl border-4 border-background shadow-xl object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-background bg-gradient-to-br from-primary/20 to-primary/5 shadow-xl">
                      <AppWindow className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* App Info */}
              <div className="flex flex-1 flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    <Balancer>{bookmark.title}</Balancer>
                  </h1>
                  {bookmark.description && (
                    <p className="text-lg text-muted-foreground">
                      <Balancer>{bookmark.description}</Balancer>
                    </p>
                  )}
                  {/* Creator */}
                  {bookmark.user && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <Link
                        href={`/u/${bookmark.user.id}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {bookmark.user.name}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    className="flex-1 sm:flex-none"
                    asChild
                  >
                    <Link
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group gap-2"
                    >
                      Get
                      <ExternalLink className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    asChild
                  >
                    <Link href="/">Share</Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* App Stats/Info */}
            <div className="flex flex-wrap gap-4 border-t pt-6">
              {bookmark.category && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-2 bg-background px-3 py-1 text-sm font-medium"
                  >
                    {bookmark.category.name}
                  </Badge>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{bookmark.views || 0} views</span>
              </div>
              {bookmark.createdAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Added{" "}
                    <time dateTime={new Date(bookmark.createdAt).toISOString()}>
                      {new Date(bookmark.createdAt).toLocaleDateString()}
                    </time>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Screenshot/Media Gallery */}
          {bookmark.ogImage && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Preview</h2>
              <div className="overflow-hidden rounded-2xl border-2 border-border bg-muted/50">
                <img
                  src={bookmark.ogImage}
                  alt="Preview"
                  className="w-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">About</h2>
            {bookmark.overview ? (
              <div className="prose prose-gray max-w-none dark:prose-invert">
                <Markdown
                  components={{
                    p: ({ children }) => (
                      <p className="my-4 leading-relaxed text-muted-foreground">
                        {children}
                      </p>
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
                      <h2 className="mt-8 text-xl font-semibold text-foreground">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mt-6 text-lg font-semibold text-foreground">
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="my-4 ml-6 list-disc text-muted-foreground">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="my-4 ml-6 list-decimal text-muted-foreground">
                        {children}
                      </ol>
                    ),
                  }}
                >
                  {bookmark.overview}
                </Markdown>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No description available for this creation.
              </p>
            )}
          </div>

          {/* More from creator section */}
          {bookmark.user && (
            <div className="border-t pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">More from {bookmark.user.name}</h3>
                  <Link
                    href={`/u/${bookmark.user.id}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    View all creations →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}
