/* From Uiverse.io by karthik092726122003 - https://uiverse.io/karthik092726122003/clever-crab-26
   MIT License, Copyright (c) karthik092726122003
   Adapted for Heal Your Heart EHR with clinical teal palette and compact scalable sizes. */

import React from "react";
import "./animatedArrowButton.css";

export interface AnimatedArrowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  direction?: "left" | "right";
  size?: "sm" | "md" | "lg";
  label?: string;
  labelPosition?: "left" | "right";
}

/**
 * Animated Circular Conveyor Arrow Button from Uiverse.io
 * Compact and adapted to Heal Your Heart's clinical design system.
 */
export function AnimatedArrowButton({
  direction = "left",
  size = "md",
  label,
  labelPosition = "right",
  className = "",
  onClick,
  ...buttonProps
}: AnimatedArrowButtonProps) {
  const buttonElement = (
    <button
      type="button"
      className={`hyh-arrow-btn dir-${direction} size-${size} ${className}`}
      onClick={label ? undefined : onClick}
      aria-label={label || (direction === "left" ? "Go back" : "Go forward")}
      {...(!label ? buttonProps : {})}
    >
      <div className="hyh-arrow-box">
        <span className="hyh-arrow-elem">
          <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className="hyh-arrow-icon"
            aria-hidden="true"
          >
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </span>
        <span className="hyh-arrow-elem">
          <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className="hyh-arrow-icon"
            aria-hidden="true"
          >
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </span>
      </div>
    </button>
  );

  if (label) {
    return (
      <button
        type="button"
        className="hyh-arrow-btn-wrapper"
        onClick={onClick}
        {...buttonProps}
      >
        {labelPosition === "left" && <span>{label}</span>}
        {buttonElement}
        {labelPosition === "right" && <span>{label}</span>}
      </button>
    );
  }

  return buttonElement;
}
