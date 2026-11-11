import { useEffect, useState } from 'react';

/**
 * An object URL for a blob that lives as long as the component does.
 *
 * `URL.createObjectURL` returns a string that the browser keeps until it is
 * revoked. Calling it inside a render body leaks one URL per re-render per
 * image, and the memory goes with it. On a phone that kills the tab in the
 * middle of a capture, and the photos - which only exist in memory at that
 * point - are lost.
 *
 * This hook creates the URL once and revokes it when the blob changes or the
 * component goes away.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const created = URL.createObjectURL(blob);
    setUrl(created);
    return () => {
      URL.revokeObjectURL(created);
    };
  }, [blob]);

  return url;
}
