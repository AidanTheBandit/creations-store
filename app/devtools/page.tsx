import { Suspense } from "react";
import type { Metadata } from "next";
import { Section, Container } from "@/components/craft";
import { DevToolsTabs } from "@/app/devtools/devtools-tabs";
import { Wiki } from "@/components/devtools/wiki";
import { HardwareReference } from "@/components/devtools/hardware-reference";

export const metadata: Metadata = {
  title: "Dev Tools",
  description:
    "Build R1 creations: the R1A wiki, an R1 emulator that simulates the 240×282 screen and device APIs, and a hardware reference.",
};

export default async function DevToolsPage() {
  return (
    <Section>
      <Container>
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Dev Tools</h1>
          <p className="mt-2 text-muted-foreground">
            Everything you need to build an R1 creation — the wiki, an emulator
            that runs your creation at the real device size, and a hardware
            reference.
          </p>
        </div>

        <Suspense fallback={null}>
          <DevToolsTabs
            wiki={<Wiki />}
            hardware={<HardwareReference />}
          />
        </Suspense>
      </Container>
    </Section>
  );
}
