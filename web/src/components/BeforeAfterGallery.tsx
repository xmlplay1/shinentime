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
 * Mobile: stacked full-width sliders. md+: horizontal row with scroll-snap.
 */
export function BeforeAfterGallery({ items }: Props) {
  return (
    <div className="mt-14 -mx-5 px-5 md:mx-0 md:px-0">
      <div className="flex flex-col gap-14 md:flex-row md:flex-nowrap md:gap-8 md:overflow-x-auto md:overflow-y-visible md:pb-4 md:snap-x md:snap-mandatory md:[scrollbar-width:thin]">
        {items.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="w-full shrink-0 snap-center md:w-[min(100%,22rem)] lg:w-[min(100%,20rem)]"
          >
            <BeforeAfterSlider
              beforeSrc={c.before}
              afterSrc={c.after}
              altBefore={c.altBefore}
              altAfter={c.altAfter}
              label={c.label}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
