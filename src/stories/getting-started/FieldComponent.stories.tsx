import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './FieldComponent';
import source from './FieldComponent?raw';

const meta = {
  title: 'Examples/Getting Started/Field Component',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const FieldComponent: StoryObj<typeof meta> = {
  name: 'Field Component',
};
