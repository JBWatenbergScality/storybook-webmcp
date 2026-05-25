import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = { component: Button, tags: ['autodocs'] };
export default meta;

export const Primary: StoryObj<typeof Button> = { args: { label: 'Click me' } };
export const Secondary: StoryObj<typeof Button> = { args: { label: 'Click me', variant: 'secondary' } };
export const LongLabel: StoryObj<typeof Button> = { args: { label: 'Click me, I have a very long label' } };
export const Quiet: StoryObj<typeof Button> = { args: { label: 'shh', variant: 'secondary' } };
