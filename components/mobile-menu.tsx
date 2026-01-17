"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { SidebarContent, Category } from "@/components/app-sidebar"

export function MobileMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden mb-4 mr-4">
          <Menu className="h-4 w-4 mr-2" />
          Filters & Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-80">
        <SidebarContent 
          categories={categories} 
          onSelect={() => setOpen(false)} 
          className="h-full border-none"
        />
      </SheetContent>
    </Sheet>
  )
}
