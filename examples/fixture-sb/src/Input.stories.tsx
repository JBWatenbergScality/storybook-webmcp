import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = { component: Input, tags: ['autodocs'] };
export default meta;

export const Default: StoryObj<typeof Input> = { args: { placeholder: 'Type here' } };
export const Disabled: StoryObj<typeof Input> = { args: { placeholder: 'Type here', disabled: true } };
