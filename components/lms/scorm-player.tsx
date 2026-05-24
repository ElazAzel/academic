"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

interface ScormPlayerProps {
  entryUrl: string;
  lessonId: string;
  title?: string;
}

export function ScormPlayer({ entryUrl, title }: ScormPlayerProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((f) => !f);
  }, []);

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <Button variant="secondary" size="sm" onClick={toggleFullscreen}>
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
        <iframe
          name="scorm-content"
          src={entryUrl}
          className="w-full h-full border-0"
          allow="fullscreen"
          title={title || "SCORM"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative border rounded-lg overflow-hidden bg-muted">
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <Button variant="secondary" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        <iframe
          name="scorm-content"
          src={entryUrl}
          className="w-full h-[600px] border-0"
          allow="fullscreen"
          title={title || "SCORM"}
        />
      </div>
    </div>
  );
}
