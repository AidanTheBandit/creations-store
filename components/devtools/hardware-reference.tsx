import {
  Cpu,
  MonitorSmartphone,
  MemoryStick,
  Camera,
  HardDrive,
  Gauge,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Spec = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  summary: string;
  details: string[];
};

// What a creation actually runs on. Sourced from the R1 hardware/RabbitOS and
// the r1-create SDK surface — kept concise so developers can budget against it.
const HARDWARE_SPECS: Spec[] = [
  {
    icon: MonitorSmartphone,
    title: "Display",
    summary: "240 × 282 px portrait",
    details: [
      "Fixed portrait orientation — no auto-rotate",
      "Design in device pixels; assume a single column",
      "For landscape content, rotate it yourself with CSS transform",
    ],
  },
  {
    icon: Cpu,
    title: "Processor",
    summary: "MediaTek MT6765",
    details: [
      "Helio P35-class octa-core ARM Cortex-A53",
      "Budget-phone class — treat CPU as scarce",
      "Avoid heavy synchronous work on the main thread",
    ],
  },
  {
    icon: MemoryStick,
    title: "Memory",
    summary: "4 GB RAM",
    details: [
      "Shared with RabbitOS and the WebView",
      "Keep bundles small; lazy-load heavy assets",
      "Release large buffers (audio/canvas) when idle",
    ],
  },
  {
    icon: HardDrive,
    title: "Runtime",
    summary: "Android WebView (RabbitOS)",
    details: [
      "Creations are web apps launched full-screen",
      "If it runs in a browser, it can run here",
      "No native toolchain required",
    ],
  },
  {
    icon: Camera,
    title: "Sensors & I/O",
    summary: "Scroll wheel · side button · camera · mic · speaker · accelerometer",
    details: [
      "Scroll wheel: relative up/down events",
      "Side button: hold-only (8 rapid taps shut the device down)",
      "Camera front/back, microphone, speaker, accelerometer",
    ],
  },
  {
    icon: HardDrive,
    title: "Storage",
    summary: "Secure + plain key/value",
    details: [
      "r1.storage.secure — encrypted (Android M+)",
      "r1.storage.plain — ordinary key/value",
      "Both auto Base64-encoded",
    ],
  },
  {
    icon: Gauge,
    title: "Performance budget",
    summary: "Animate lean",
    details: [
      "Avoid 60 fps full-screen redraws when idle",
      "Animate transform/opacity only during interaction",
      "Cache aggressively; network and CPU are both limited",
    ],
  },
];

// Server component — pure data render.
export function HardwareReference() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Your creation runs in an Android WebView on modest hardware. Budget
        against these limits rather than desktop expectations.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HARDWARE_SPECS.map((spec) => {
          const Icon = spec.icon;
          return (
            <Card key={spec.title}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{spec.title}</CardTitle>
                </div>
                <CardDescription>{spec.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {spec.details.map((d) => (
                    <li key={d} className="flex gap-2">
                      <span className="text-primary">·</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
