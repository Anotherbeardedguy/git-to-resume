"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface CVInsertBoxProps {
  text: string;
  shareableLink?: string;
}

export function CVInsertBox({ text, shareableLink }: CVInsertBoxProps) {
  const [copied, setCopied] = useState(false);

  const fullText = shareableLink ? `${text}\n\nVerify: ${shareableLink}` : text;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">CV Insert</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-8"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-4 rounded-lg border font-mono">
          {fullText}
        </pre>
      </CardContent>
    </Card>
  );
}
