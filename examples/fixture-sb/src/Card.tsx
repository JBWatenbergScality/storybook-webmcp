export type CardProps = {
  /** Card title */
  title: string;
  /** Card body content */
  children?: React.ReactNode;
};

export const Card = ({ title, children }: CardProps) => (
  <section><h3>{title}</h3>{children}</section>
);
