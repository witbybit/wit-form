import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './OutsideProvider';
import source from './OutsideProvider?raw';

const meta = {
  title: 'Examples/Advanced/Outside the Provider',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const OutsideTheProvider: StoryObj<typeof meta> = {
  name: 'Outside the Provider',
};
