import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './ExtraInfo';
import source from './ExtraInfo?raw';

const meta = {
  title: 'Examples/Patterns/Extra Info & Files',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const ExtraInfoFiles: StoryObj<typeof meta> = {
  name: 'Extra Info & Files',
};
