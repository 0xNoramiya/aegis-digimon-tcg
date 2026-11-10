import { useEffect, useState } from "react";
import { accountApi } from "./client";

export function useSignedIn(): boolean | undefined {
  const [signedIn, setSignedIn] = useState<boolean>();
  useEffect(() => {
    let active = true;
    void accountApi
      .me()
      .then((account) => {
        if (active) setSignedIn(account !== null);
      })
      .catch(() => {
        if (active) setSignedIn(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return signedIn;
}
