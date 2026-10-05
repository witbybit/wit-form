import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './FormLevelValidation';
import source from './FormLevelValidation?raw';

const meta = {
  title: 'Examples/Validation/Form-level Rules',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const FormLevelRules: StoryObj<typeof meta> = {
  name: 'Form-level Rules',
};
