"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBookmark, updateBookmark } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/lib/data";

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
  isFavorite: boolean;
  isArchived: boolean;
  status: "draft" | "published";
}

interface BookmarkFormProps {
  categories: Category[];
  userId: string;
  mode: "create" | "edit";
  bookmark?: Bookmark;
}

export function BookmarkForm({
  categories,
  userId,
  mode,
  bookmark,
}: BookmarkFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: bookmark?.title || "",
    slug: bookmark?.slug || "",
    url: bookmark?.url || "",
    description: bookmark?.description || "",
    overview: bookmark?.overview || "",
    favicon: bookmark?.favicon || "",
    ogImage: bookmark?.ogImage || "",
    categoryId: bookmark?.categoryId || "none",
    isFavorite: bookmark?.isFavorite || false,
    isArchived: bookmark?.isArchived || false,
    status: bookmark?.status || "draft",
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormData((prev) => ({ ...prev, title, slug }));
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let url = e.target.value.trim();
    if (url && !url.match(/^https?:\/\//)) {
      url = `https://${url}`;
    }
    setFormData((prev) => ({ ...prev, url }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formDataObj = new FormData(e.currentTarget);
      formDataObj.append("userId", userId);

      // Add status for new bookmarks
      if (mode === "create") {
        formDataObj.append("status", formData.status);
      }

      const result = mode === "create"
        ? await createBookmark(null, Object.fromEntries(formDataObj) as any)
        : await updateBookmark(null, {
            ...(Object.fromEntries(formDataObj) as any),
            id: bookmark!.id.toString(),
            userId,
          });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(mode === "create" ? "Bookmark created!" : "Bookmark updated!");
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Error saving bookmark:", err);
      toast.error("Failed to save bookmark");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="id" value={bookmark?.id || ""} />
      <input type="hidden" name="slug" value={formData.slug} />

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-2">
          <Label htmlFor="url">URL *</Label>
          <Input
            id="url"
            name="url"
            type="url"
            required
            value={formData.url}
            onChange={handleUrlChange}
            placeholder="https://example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            required
            value={formData.title}
            onChange={handleTitleChange}
            placeholder="My Awesome Resource"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="A brief description of this resource"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="overview">Overview</Label>
          <Textarea
            id="overview"
            name="overview"
            value={formData.overview}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, overview: e.target.value }))
            }
            placeholder="Detailed overview or notes about this resource"
            rows={5}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            name="categoryId"
            value={formData.categoryId}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, categoryId: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="favicon">Favicon URL</Label>
            <Input
              id="favicon"
              name="favicon"
              type="url"
              value={formData.favicon}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, favicon: e.target.value }))
              }
              placeholder="https://example.com/favicon.ico"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ogImage">OG Image URL</Label>
            <Input
              id="ogImage"
              name="ogImage"
              type="url"
              value={formData.ogImage}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, ogImage: e.target.value }))
              }
              placeholder="https://example.com/og-image.png"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isFavorite"
              name="isFavorite"
              checked={formData.isFavorite}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isFavorite: checked as boolean }))
              }
              value="true"
            />
            <Label htmlFor="isFavorite" className="cursor-pointer">
              Favorite
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isArchived"
              name="isArchived"
              checked={formData.isArchived}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isArchived: checked as boolean }))
              }
              value="true"
            />
            <Label htmlFor="isArchived" className="cursor-pointer">
              Archived
            </Label>
          </div>
        </div>

        {mode === "create" && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              name="status"
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, status: value as "draft" | "published" }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft - Not visible publicly</SelectItem>
                <SelectItem value="published">Published - Visible to everyone</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formData.status === "draft"
                ? "This bookmark will only be visible to you"
                : "This bookmark will be visible to everyone"}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            mode === "create" ? "Create Bookmark" : "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
