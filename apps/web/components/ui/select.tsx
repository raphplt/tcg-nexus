import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ children, className = "input input-bordered", ...props }, ref) => (
    <select ref={ref} className={className} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select"; 