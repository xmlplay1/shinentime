"use client";

import { motion } from "framer-motion";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

export type Transformation = {
  readonly before: string;
  readonly after: string;
  readonly altBefore: string;
  readonly altAfter: string;
  readonly label: string;
};

type Props = {
  readonly items: readonly Transformation[];
};

/**
 * Mobile: stacked full-width sliders. lg+: horizontal row with scroll-snap.
 */
export function BeforeAfterGallery({ items }: Props) {
  return (
    <div className="mt-14 w-full max-w-full overflow-x-hidden px-0 lg:px-0">
      <div className="flex flex-col gap-14 lg:flex-row lg:flex-nowrap lg:gap-8 lg:overflow-x-auto lg:overflow-y-visible lg:pb-4 lg:snap-x lg:snap-mandatory lg:[scrollbar-width:thin]">
        {items.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="w-full shrink-0 snap-center lg:w-[min(100%,22rem)] xl:w-[min(100%,20rem)]"
          >
            <BeforeAfterSlider
              beforeSrc={c.before}
              afterSrc={c.after}
              altBefore={c.altBefore}
              altAfter={c.altAfter}
              label={c.label}
              priority={i === 0}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
