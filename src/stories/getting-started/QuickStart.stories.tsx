import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './QuickStart';
import source from './QuickStart?raw';

const meta = {
  title: 'Examples/Getting Started/Quick Start',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const QuickStart: StoryObj<typeof meta> = { name: 'Quick Start' };
