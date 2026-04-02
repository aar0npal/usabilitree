"use client";

import { motion } from "framer-motion";

interface AnimatedItemProps {
  children: React.ReactNode;
  index: number;
}

export function AnimatedItem({ children, index }: AnimatedItemProps) {
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
    >
      {children}
    </motion.div>
  );
}
