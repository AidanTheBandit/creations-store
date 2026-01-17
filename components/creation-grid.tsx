import React from "react";

export const CreationGrid = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className="fade-in h-full"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

// Legacy component alias for backward compatibility
export const BookmarkGrid = CreationGrid;
