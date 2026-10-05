import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './NestedFieldArrays';
import source from './NestedFieldArrays?raw';

const meta = {
  title: 'Examples/Field Arrays/Nested Arrays',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const NestedArrays: StoryObj<typeof meta> = { name: 'Nested Arrays' };
