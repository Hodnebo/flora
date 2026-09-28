import type { ReactElement, ReactNode } from "react";
import type { Category } from "../domain/category";

export function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
      <path
        d="M12.25 4.5 7 10l5.25 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
      <path
        d="M7.75 4.5 13 10l-5.25 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const iconStroke = {
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function CategorySvg({ children }: { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
      {children}
    </svg>
  );
}

function VegetableIcon() {
  return (
    <CategorySvg>
      <path d="M10 5.5 13.5 16H6.5L10 5.5Z" {...iconStroke} />
      <path d="M10 5.5V3.5M8 4.5 10 5.5M12 4.5 10 5.5" {...iconStroke} />
    </CategorySvg>
  );
}

function FruitIcon() {
  return (
    <CategorySvg>
      <circle cx="10" cy="11.5" r="5" {...iconStroke} />
      <path d="M10 6.5V4.25M10 4.25c1.25-.75 2.5-.5 3 .75" {...iconStroke} />
    </CategorySvg>
  );
}

function BerryIcon() {
  return (
    <CategorySvg>
      <circle cx="10" cy="14" r="2.25" {...iconStroke} />
      <circle cx="7" cy="9.5" r="2.25" {...iconStroke} />
      <circle cx="13" cy="9.5" r="2.25" {...iconStroke} />
    </CategorySvg>
  );
}

function LegumeIcon() {
  return (
    <CategorySvg>
      <path d="M7.5 5.5c3-2.5 6.5-1 6.5 4.5s-3.5 7-6.5 4.5c-2-1.5-2.5-5 .5-6.5" {...iconStroke} />
      <circle cx="9.5" cy="9.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </CategorySvg>
  );
}

function GrainIcon() {
  return (
    <CategorySvg>
      <path d="M10 16.5V5" {...iconStroke} />
      <path d="M10 7.5 7.5 6M10 9.5 12.5 8M10 11.5 7.5 10.5M10 13.5 12.5 12.5" {...iconStroke} />
    </CategorySvg>
  );
}

function NutIcon() {
  return (
    <CategorySvg>
      <path
        d="M10 4.5c2.5 2 3.5 5 2.5 8.5-1 3-3.5 4.5-5.5 3.5S4 14 4.5 10.5C5 7 7.5 4.5 10 4.5Z"
        {...iconStroke}
      />
    </CategorySvg>
  );
}

function SeedIcon() {
  return (
    <CategorySvg>
      <ellipse cx="8" cy="8" rx="1.6" ry="2.4" transform="rotate(-25 8 8)" {...iconStroke} />
      <ellipse cx="12.5" cy="10" rx="1.6" ry="2.4" transform="rotate(20 12.5 10)" {...iconStroke} />
      <ellipse
        cx="9.5"
        cy="13.5"
        rx="1.6"
        ry="2.4"
        transform="rotate(-10 9.5 13.5)"
        {...iconStroke}
      />
    </CategorySvg>
  );
}

function HerbIcon() {
  return (
    <CategorySvg>
      <path d="M10 16V6" {...iconStroke} />
      <path
        d="M10 8c-2.5-1.5-3.5.5-2 2M10 11c2.5-1.5 3.5.5 2 2M10 14c-2.5-1.5-3.5.5-2 2"
        {...iconStroke}
      />
    </CategorySvg>
  );
}

function SpiceIcon() {
  return (
    <CategorySvg>
      <path d="M10 4.5v11M4.5 10h11M6.8 6.8l6.4 6.4M13.2 6.8 6.8 13.2" {...iconStroke} />
    </CategorySvg>
  );
}

function OtherIcon() {
  return (
    <CategorySvg>
      <circle cx="10" cy="10" r="5.5" {...iconStroke} />
      <circle cx="10" cy="10" r="1.25" fill="currentColor" stroke="none" />
    </CategorySvg>
  );
}

const categoryIcons = {
  vegetable: VegetableIcon,
  fruit: FruitIcon,
  berry: BerryIcon,
  legume: LegumeIcon,
  grain: GrainIcon,
  nut: NutIcon,
  seed: SeedIcon,
  herb: HerbIcon,
  spice: SpiceIcon,
  other: OtherIcon,
} satisfies Record<Category, () => ReactElement>;

export function CategoryIcon({ category }: { category: Category }) {
  const Icon = categoryIcons[category];
  return <Icon />;
}
