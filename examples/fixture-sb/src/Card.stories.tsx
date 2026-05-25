import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta: Meta<typeof Card> = { component: Card, tags: ['autodocs'] };
export default meta;

export const Empty: StoryObj<typeof Card> = { args: { title: 'A card' } };
export const WithBody: StoryObj<typeof Card> = { args: { title: 'A card', children: 'Body text' } };
