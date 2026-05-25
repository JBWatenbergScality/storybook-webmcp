export type ButtonProps = {
  /** Visible label */
  label: string;
  /** Visual variant */
  variant?: 'primary' | 'secondary';
  /** Click handler */
  onClick?: () => void;
};

export const Button = ({ label, variant = 'primary', onClick }: ButtonProps) => (
  <button type="button" data-variant={variant} onClick={onClick}>{label}</button>
);
