import { useEffect, useRef } from "react";

type ResumeOptions = {
  throttleMs?: number;
  resumeOnFocus?: boolean;
  resumeOnVisible?: boolean;
  resumeOnOnline?: boolean;
};

export function useResumeRefresh(
  onResume: () => void | Promise<void>,
  options: ResumeOptions = {}
) {
  const {
    throttleMs = 1000,
    resumeOnFocus = true,
    resumeOnVisible = true,
    resumeOnOnline = true,
  } = options;
  const onResumeRef = useRef(onResume);
  const lastRunRef = useRef(0);
  const runningRef = useRef(false);

  useEffect(() => {
    onResumeRef.current = onResume;
  }, [onResume]);

  useEffect(() => {
    const shouldRun = () => {
      const now = Date.now();
      if (runningRef.current) return false;
      if (now - lastRunRef.current < throttleMs) return false;
      lastRunRef.current = now;
      return true;
    };

    const run = async () => {
      if (!shouldRun()) return;
      runningRef.current = true;
      try {
        await onResumeRef.current();
      } finally {
        runningRef.current = false;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void run();
      }
    };

    const handleFocus = () => {
      void run();
    };

    const handleOnline = () => {
      void run();
    };

    if (resumeOnVisible) {
      document.addEventListener("visibilitychange", handleVisibility);
    }
    if (resumeOnFocus) {
      window.addEventListener("focus", handleFocus);
    }
    if (resumeOnOnline) {
      window.addEventListener("online", handleOnline);
    }

    return () => {
      if (resumeOnVisible) {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
      if (resumeOnFocus) {
        window.removeEventListener("focus", handleFocus);
      }
      if (resumeOnOnline) {
        window.removeEventListener("online", handleOnline);
      }
    };
  }, [throttleMs, resumeOnFocus, resumeOnVisible, resumeOnOnline]);
}
