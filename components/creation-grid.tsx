import React from "react";

export const CreationGrid = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
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
