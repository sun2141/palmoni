import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0F14] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#C9A84C] to-[#E0BE6A] text-[#0D0F14] font-bold shadow-[0_4px_20px_rgba(201,168,76,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(201,168,76,0.4)] hover:from-[#E0BE6A] hover:to-[#C9A84C]",
        destructive:
          "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-[0_4px_14px_rgba(239,68,68,0.3)] hover:-translate-y-0.5",
        outline:
          "border border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.06)] text-[#C8C4BB] hover:bg-[rgba(201,168,76,0.12)] hover:border-[#C9A84C] hover:text-[#E8C86A]",
        secondary:
          "bg-[rgba(255,255,255,0.06)] text-[#C8C4BB] border border-[rgba(255,255,255,0.14)] hover:bg-[rgba(255,255,255,0.1)] hover:text-[#F5F2EC]",
        ghost:
          "text-[#9E9A92] hover:bg-[rgba(255,255,255,0.07)] hover:text-[#C8C4BB]",
        link:
          "text-[#C9A84C] underline-offset-4 hover:underline hover:text-[#E0BE6A]",
        success:
          "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.35)] hover:-translate-y-0.5",
        glass:
          "bg-[rgba(20,23,32,0.85)] backdrop-blur-md border border-[rgba(201,168,76,0.2)] text-[#C8C4BB] hover:bg-[rgba(30,33,48,0.9)] hover:border-[rgba(201,168,76,0.4)] shadow-lg",
      },
      size: {
        default: "h-11 px-6 py-2 text-sm",
        sm: "h-11 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
