"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Building2, Loader2 } from "lucide-react";

interface Props {
  onSuccess: (code: string) => void;
  customerName?: string;
  customerEmail?: string;
  className?: string;
  loading?: boolean;
}

export function MonoConnectButton({
  onSuccess,
  customerName,
  customerEmail,
  className,
  loading,
}: Props) {
  const monoRef = useRef<any>(null);
  const publicKey =
    process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY ?? "test_pk_motvesx7zhebqcgkvyi0";

  useEffect(() => {
    if (!publicKey || monoRef.current) return;
    import("@mono.co/connect.js").then(({ default: MonoConnect }) => {
      monoRef.current = new MonoConnect({
        key: publicKey,
        data: {
          customer: {
            name: customerName || "User",
            email: customerEmail || "",
          },
        },
        onSuccess: ({ code }: { code: string }) => {
          console.log("🎯 Got Mono auth code:", code);
          onSuccess(code);
        },
        onClose: () => {},
      });
      monoRef.current.setup();
    });
  }, [publicKey, customerName, customerEmail, onSuccess]);

  return (
    <Button
      onClick={() => monoRef.current?.open()}
      variant="outline"
      className={className}
      disabled={loading || !publicKey}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Building2 className="w-4 h-4 mr-2" />
      )}
      {publicKey ? "Connect Bank Account" : "Bank Connect (key not set)"}
    </Button>
  );
}
