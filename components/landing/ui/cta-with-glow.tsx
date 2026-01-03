import { ShimmerButton } from "./shimmer-button";
import { Glow } from "./glow";
import { cn } from "../../../lib/utils";

interface CTAProps {
  title: string;
  action: {
    text: string;
  };
  onAction?: () => void;
  className?: string;
}

export function CTASection({ title, action, onAction, className }: CTAProps) {
  return (
    <section className={cn("group relative overflow-hidden py-24 sm:py-32", className)}>
      <div className="relative z-10 mx-auto flex max-w-container flex-col items-center gap-6 px-4 text-center sm:gap-8">
        <h2 className="text-3xl font-semibold sm:text-5xl animate-appear">
          {title}
        </h2>
        <div className="animate-appear delay-100">
          <ShimmerButton
            onClick={onAction}
            className="px-8 py-4 text-lg font-bold shadow-xl"
          >
            {action.text}
          </ShimmerButton>
        </div>
      </div>
      <div className="absolute left-0 top-0 h-full w-full translate-y-[1rem] opacity-80 transition-all duration-500 ease-in-out group-hover:translate-y-[-2rem] group-hover:opacity-100">
        <Glow variant="bottom" className="animate-appear-zoom delay-300" />
      </div>
    </section>
  );
}
