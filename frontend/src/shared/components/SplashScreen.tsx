import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const SESSION1_DURATION = 3000;
const SESSION2_DURATION = 3000;

export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [session, setSession] = useState<1 | 2>(1);

  const mainWords = ["Lintas", "Data", "Prima"];

  useEffect(() => {
    const toSession2 = setTimeout(() => setSession(2), SESSION1_DURATION);
    const endAll = setTimeout(
      () => setShow(false),
      SESSION1_DURATION + SESSION2_DURATION
    );

    return () => {
      clearTimeout(toSession2);
      clearTimeout(endAll);
    };
  }, []);

  // Handle skip animation on click
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
          {/* ========== SESI 1 ========== */}
          {session === 1 && (
            <motion.div
              key="session1"
              className="flex flex-col items-center"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Lintas Data Prima */}
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

              {/* Enhance Your Business */}
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

          {/* ========== SESI 2 ========== */}
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

                {/* BLOK UNGU (full responsive) */}
                <motion.div
                  className="absolute inset-0 bg-[#800080]"
                  style={{ originX: 0 }}
                  initial={{ scaleX: 0, opacity: 1 }}
                  animate={{
                    scaleX: [0, 1, 1, 0],  // muncul  penuh  shrink kirikanan
                    opacity: [1, 1, 1, 0], // fade saat shrink
                  }}
                  transition={{
                    duration: 2.8,
                    ease: "easeInOut",
                    times: [0, 0.45, 0.7, 1],
                    delay: 0.1,
                  }}
                />

                {/* TEKS  masuk setelah blok penuh */}
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

          {/* Skip Hint */}
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


