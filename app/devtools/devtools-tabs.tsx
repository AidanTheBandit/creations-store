"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { R1Emulator } from "@/components/devtools/r1-emulator";

const TABS = ["wiki", "emulator", "hardware"] as const;
type TabKey = (typeof TABS)[number];

// Client shell so tab state can be deep-linked via ?tab=. The Wiki and Hardware
// panels are server-rendered and passed in as children; only the emulator needs
// client interactivity.
export function DevToolsTabs({
  wiki,
  hardware,
}: {
  wiki: React.ReactNode;
  hardware: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const param = searchParams.get("tab");
  const active: TabKey = TABS.includes(param as TabKey)
    ? (param as TabKey)
    : "wiki";

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.replace(`/devtools?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={active} onValueChange={onChange} className="w-full">
      <TabsList className="h-auto w-full max-w-md gap-1 p-1">
        <TabsTrigger value="wiki" className="flex-1 py-1.5">
          Wiki
        </TabsTrigger>
        <TabsTrigger value="emulator" className="flex-1 py-1.5">
          Emulator
        </TabsTrigger>
        <TabsTrigger value="hardware" className="flex-1 py-1.5">
          Hardware
        </TabsTrigger>
      </TabsList>
      <TabsContent value="wiki" className="mt-8">
        {wiki}
      </TabsContent>
      <TabsContent value="emulator" className="mt-8">
        <R1Emulator />
      </TabsContent>
      <TabsContent value="hardware" className="mt-8">
        {hardware}
      </TabsContent>
    </Tabs>
  );
}
