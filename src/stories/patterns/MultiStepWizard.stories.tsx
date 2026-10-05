import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './MultiStepWizard';
import source from './MultiStepWizard?raw';

const meta = {
  title: 'Examples/Patterns/Multi-step Wizard',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const MultiStepWizard: StoryObj<typeof meta> = {
  name: 'Multi-step Wizard',
};
