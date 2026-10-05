import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './ImperativeUpdates';
import source from './ImperativeUpdates?raw';

const meta = {
  title: 'Examples/Patterns/Imperative Updates',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const ImperativeUpdates: StoryObj<typeof meta> = {
  name: 'Imperative Updates',
};
