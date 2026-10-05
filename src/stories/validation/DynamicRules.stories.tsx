import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './DynamicRules';
import source from './DynamicRules?raw';

const meta = {
  title: 'Examples/Validation/Dynamic Rules',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const DynamicRules: StoryObj<typeof meta> = { name: 'Dynamic Rules' };
