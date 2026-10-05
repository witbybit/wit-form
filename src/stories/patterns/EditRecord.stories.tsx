import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSource } from '../components/SourcePanel';
import Example from './EditRecord';
import source from './EditRecord?raw';

const meta = {
  title: 'Examples/Patterns/Edit a Record',
  component: Example,
  decorators: [withSource(source)],
} satisfies Meta<typeof Example>;

export default meta;

// Named like the title so the sidebar shows a single entry
export const EditARecord: StoryObj<typeof meta> = { name: 'Edit a Record' };
