import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './RenderPerformance';
import source from './RenderPerformance?raw';

const meta = {
  title: 'Examples/Advanced/Render Performance',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const RenderPerformance: StoryObj<typeof meta> = {
  name: 'Render Performance',
};
