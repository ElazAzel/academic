"use client";

import React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

const slideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={fadeIn}
      initial={shouldReduce ? "visible" : "hidden"}
      animate="visible"
      transition={shouldReduce ? { duration: 0 } : { delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={slideUp}
      initial={shouldReduce ? "visible" : "hidden"}
      animate="visible"
      transition={shouldReduce ? { duration: 0 } : { delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={scaleIn}
      initial={shouldReduce ? "visible" : "hidden"}
      animate="visible"
      transition={shouldReduce ? { duration: 0 } : { delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className,
  staggerDelay = 0.06,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduce ? "visible" : "hidden"}
      animate="visible"
      variants={shouldReduce ? undefined : { visible: { transition: { staggerChildren: staggerDelay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function CardHover({ children, className }: { children: React.ReactNode; className?: string }) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      className={cn("transition-shadow duration-200", className)}
      whileHover={shouldReduce ? undefined : { scale: 1.012, transition: { type: "spring", stiffness: 400, damping: 25 } }}
      whileTap={shouldReduce ? undefined : { scale: 0.985 }}
    >
      {children}
    </motion.div>
  );
}

export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduce ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * ListStagger — последовательный вход элементов списка с CSS animation.
 * Использует класс .list-item-enter с кастомной animation-delay через style.
 * Альтернатива framer-motion Stagger для простых списков без перерендера.
 */
export function ListStagger({
  children,
  className,
  staggerDelay = 60,
  baseDelay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  baseDelay?: number;
}) {
  const items = React.Children.toArray(children);
  return (
    <div className={className}>
      {items.map((child, i) => (
        <div
          key={i}
          className="list-item-enter"
          style={{ animationDelay: `${baseDelay + i * staggerDelay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

export { motion };
