import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './Invoice';
import source from './Invoice?raw';

const meta = {
  title: 'Examples/Field Arrays/Invoice',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const Invoice: StoryObj<typeof meta> = { name: 'Invoice' };
