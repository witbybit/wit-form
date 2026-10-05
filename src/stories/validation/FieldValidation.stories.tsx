import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './FieldValidation';
import source from './FieldValidation?raw';

const meta = {
  title: 'Examples/Validation/Field Rules',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const FieldRules: StoryObj<typeof meta> = { name: 'Field Rules' };
