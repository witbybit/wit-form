import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './LivePreview';
import source from './LivePreview?raw';

const meta = {
  title: 'Examples/Watching Values/Live Preview',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const LivePreview: StoryObj<typeof meta> = { name: 'Live Preview' };
