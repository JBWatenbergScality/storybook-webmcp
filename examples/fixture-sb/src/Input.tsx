import React from 'react';

export type InputProps = {
  /** Placeholder text */
  placeholder?: string;
  /** Disable the input */
  disabled?: boolean;
};

export const Input = ({ placeholder, disabled }: InputProps) => (
  <input type="text" placeholder={placeholder} disabled={disabled} />
);
