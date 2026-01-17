"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, EyeOff, Eye, Trash2 } from "lucide-react";
import {
  createBookmark,
  updateBookmark,
  deleteBookmark,
  publishBookmark,
  type ActionState,
} from "@/lib/actions";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
}

interface Bookmark {
  id: number;
  title: string;
  slug: string;
  url: string;
  description: string | null;
  overview: string | null;
  favicon: string | null;
  ogImage: string | null;
  categoryId: string | null;
  status: "draft" | "published";
  isFavorite: boolean;
  isArchived: boolean;
}

interface BookmarkWithCategory extends Bookmark {
  category: Category | null;
}

interface UserBookmarkManagerProps {
  bookmarks: BookmarkWithCategory[];
  categories: Category[];
  userId: string;
}

export function UserBookmarkManager({
  bookmarks,
  categories,
  userId,
}: UserBookmarkManagerProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handlePublish = async (id: string) => {
    setIsPublishing(id);
    try {
      const result = await publishBookmark(null, { id, userId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Bookmark published!");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to publish");
    } finally {
      setIsPublishing(null);
    }
  };

  const handleDelete = async (bookmark: BookmarkWithCategory) => {
    if (!confirm("Are you sure you want to delete this bookmark?")) {
      return;
    }

    setIsDeleting(bookmark.id.toString());
    try {
      const result = await deleteBookmark(null, {
        id: bookmark.id.toString(),
        url: bookmark.url,
        userId,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Bookmark deleted!");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          My Bookmarks
        </h2>
        <Button
          onClick={() => router.push("/dashboard/new")}
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Bookmark
        </Button>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            You haven't created any bookmarks yet
          </p>
          <Button onClick={() => router.push("/dashboard/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Bookmark
          </Button>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookmarks.map((bookmark) => (
                <TableRow key={bookmark.id}>
                  <TableCell className="font-medium">
                    {bookmark.title}
                  </TableCell>
                  <TableCell>
                    {bookmark.category ? (
                      <Badge
                        style={{
                          backgroundColor: bookmark.category.color || undefined,
                          color: "white",
                        }}
                      >
                        {bookmark.category.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={bookmark.status === "published" ? "default" : "secondary"}
                    >
                      {bookmark.status === "published" ? (
                        <>
                          <Eye className="mr-1 h-3 w-3" />
                          Published
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-1 h-3 w-3" />
                          Draft
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {bookmark.status === "draft" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePublish(bookmark.id.toString())}
                          disabled={isPublishing === bookmark.id.toString()}
                        >
                          {isPublishing === bookmark.id.toString() ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Publish"
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/edit/${bookmark.id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(bookmark)}
                        disabled={isDeleting === bookmark.id.toString()}
                      >
                        {isDeleting === bookmark.id.toString() ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
