import { useEffect, useState } from "react";
import { signFileUrl } from "@/lib/storageUrl";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string | null | undefined;
  fallback?: string;
};

export function SignedImage({ src, fallback, ...rest }: Props) {
  const [resolved, setResolved] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = await signFileUrl(src, 3600);
      if (!cancelled) setResolved(url || fallback || undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [src, fallback]);

  if (!resolved) return null;
  return <img src={resolved} {...rest} />;
}
