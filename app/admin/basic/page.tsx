"use client";

import { useState } from "react";
import AdminHeader from "@/components/admin/admin-header";

export default function AdminPage() {
  const [formData, setFormData] = useState({
    url: "",
    title: "",
    slug: "",
    description: "",
    categoryId: "",
    overview: "",
    iconUrl: "",
    themeColor: "#fe5000",
    author: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/creations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to add creation");
      }

      // Clear form after successful submission
      setFormData({
        url: "",
        title: "",
        slug: "",
        description: "",
        categoryId: "",
        overview: "",
        iconUrl: "",
        themeColor: "#fe5000",
        author: "",
      });

      alert("Creation added successfully!");
    } catch (error) {
      console.error("Error adding creation:", error);
      alert("Failed to add creation. Please try again.");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="mb-6 text-3xl font-bold">Add New Creation</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="mb-1 block text-sm font-medium">
              URL *
            </label>
            <input
              type="url"
              id="url"
              name="url"
              required
              value={formData.url}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label htmlFor="slug" className="mb-1 block text-sm font-medium">
              Slug
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
              placeholder="Auto-generated from title if empty"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
              rows={3}
            />
          </div>

          <div>
            <label
              htmlFor="categoryId"
              className="mb-1 block text-sm font-medium"
            >
              Category ID
            </label>
            <input
              type="text"
              id="categoryId"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
              placeholder="e.g., ai-tools, productivity"
            />
          </div>

          <div>
            <label
              htmlFor="overview"
              className="mb-1 block text-sm font-medium"
            >
              Overview
            </label>
            <textarea
              id="overview"
              name="overview"
              value={formData.overview}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
              rows={3}
            />
          </div>

          <div>
            <label
              htmlFor="iconUrl"
              className="mb-1 block text-sm font-medium"
            >
              Icon URL
            </label>
            <input
              type="url"
              id="iconUrl"
              name="iconUrl"
              value={formData.iconUrl}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label
              htmlFor="themeColor"
              className="mb-1 block text-sm font-medium"
            >
              Theme Color
            </label>
            <input
              type="color"
              id="themeColor"
              name="themeColor"
              value={formData.themeColor}
              onChange={handleChange}
              className="w-20 h-10 rounded-md border p-1"
            />
          </div>

          <div>
            <label
              htmlFor="author"
              className="mb-1 block text-sm font-medium"
            >
              Author
            </label>
            <input
              type="text"
              id="author"
              name="author"
              value={formData.author}
              onChange={handleChange}
              className="w-full rounded-md border p-2"
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Add Creation
          </button>
        </form>
      </div>
    </>
  );
}
