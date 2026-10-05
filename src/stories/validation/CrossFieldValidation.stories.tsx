import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './CrossFieldValidation';
import source from './CrossFieldValidation?raw';

const meta = {
  title: 'Examples/Validation/Cross-field Rules',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const CrossFieldRules: StoryObj<typeof meta> = {
  name: 'Cross-field Rules',
};
