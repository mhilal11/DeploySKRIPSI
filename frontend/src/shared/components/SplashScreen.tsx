import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import {
  consumeLandingSplashSkipOnce,
  hasLandingSplashShown,
  markLandingSplashShown,
} from "@/shared/lib/landing-splash";

const SESSION1_DURATION = 3000;
const SESSION2_DURATION = 3000;

function shouldShowLandingSplash(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.location.pathname !== "/") {
    return false;
  }

  if (consumeLandingSplashSkipOnce()) {
    markLandingSplashShown();
    return false;
  }

  const navEntry = window.performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const navigationType = navEntry?.type ?? "navigate";

  if (navigationType === "reload") {
    return true;
  }

  if (navigationType !== "navigate") {
    return false;
  }

  return !hasLandingSplashShown();
}

export default function SplashScreen() {
  const [show, setShow] = useState<boolean>(() => shouldShowLandingSplash());
  const [session, setSession] = useState<1 | 2>(1);

  const mainWords = ["Lintas", "Data", "Prima"];

  useEffect(() => {
    if (!show) {
      return;
    }
    markLandingSplashShown();
    setSession(1);
  }, [show]);

  useEffect(() => {
    if (!show) {
      return;
    }

    const toSession2 = setTimeout(() => setSession(2), SESSION1_DURATION);
    const endAll = setTimeout(
      () => setShow(false),
      SESSION1_DURATION + SESSION2_DURATION
    );

    return () => {
      clearTimeout(toSession2);
      clearTimeout(endAll);
    };
  }, [show]);

  const handleSkip = () => {
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center cursor-pointer"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          onClick={handleSkip}
        >
          {session === 1 && (
            <motion.div
              key="session1"
              className="flex flex-col items-center"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="flex gap-3 text-white text-3xl md:text-5xl font-bold font-poppins tracking-wide"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: { staggerChildren: 0.35 },
                  },
                }}
              >
                {mainWords.map((word, idx) => (
                  <motion.span
                    key={idx}
                    className="inline-block"
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.5 },
                      },
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.div>

              <motion.p
                className="text-gray-400 text-sm md:text-xl mt-4 font-poppins"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 }}
              >
                Enhance Your Business
              </motion.p>
            </motion.div>
          )}

          {session === 2 && (
            <motion.div
              key="session2"
              className="flex flex-col items-center mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-full max-w-xl h-10 md:h-12 px-6 md:px-12 relative overflow-hidden rounded flex items-center justify-center">
                <motion.div
                  className="absolute inset-0 bg-[#800080]"
                  style={{ originX: 0 }}
                  initial={{ scaleX: 0, opacity: 1 }}
                  animate={{
                    scaleX: [0, 1, 1, 0],
                    opacity: [1, 1, 1, 0],
                  }}
                  transition={{
                    duration: 2.8,
                    ease: "easeInOut",
                    times: [0, 0.45, 0.7, 1],
                    delay: 0.1,
                  }}
                />

                <motion.span
                  className="relative z-10 text-white text-xl md:text-3xl font-mulish font-extralight tracking-widest text-center"
                  initial={{ x: "-100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut",
                    delay: 0.95,
                  }}
                >
                  Jadikan Satu!
                </motion.span>
              </div>
            </motion.div>
          )}

          <motion.p
            className="absolute bottom-8 text-gray-500 text-sm font-poppins"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            Klik di mana saja untuk skip
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

