'use client';

import { motion } from 'framer-motion';

export const MotionDiv = motion.div;
export const MotionSection = motion.section;
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 }
};
export const stagger = {
  visible: { transition: { staggerChildren: 0.08 } }
};
