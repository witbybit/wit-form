import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './ConditionalFields';
import source from './ConditionalFields?raw';

const meta = {
  title: 'Examples/Watching Values/Conditional Fields',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const ConditionalFields: StoryObj<typeof meta> = {
  name: 'Conditional Fields',
};
