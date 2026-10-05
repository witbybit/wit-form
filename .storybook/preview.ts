import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { disable: true },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Documentation',
          [
            'Getting Started',
            'Core Concepts',
            'Guides',
            [
              'Validation',
              'Field Arrays',
              'Watching Values',
              'Loading and Saving Data',
              'Performance',
              'Migrating from react-recoil-form',
            ],
            'API',
            [
              'FormProvider',
              'useForm',
              'useField',
              'Field',
              'useFieldArray',
              'Watch Hooks',
              'useFormContext',
              'useSetFormProps',
              'Types',
            ],
          ],
          'Examples',
          [
            'Getting Started',
            ['Quick Start', 'Field Component'],
            'Validation',
            [
              'Field Rules',
              'Cross-field Rules',
              'Dynamic Rules',
              'Form-level Rules',
            ],
            'Field Arrays',
            ['Invoice', 'Nested Arrays'],
            'Watching Values',
            ['Conditional Fields', 'Live Preview'],
            'Patterns',
            [
              'Multi-step Wizard',
              'Edit a Record',
              'Imperative Updates',
              'Extra Info & Files',
            ],
            'Advanced',
            ['Render Performance', 'Outside the Provider'],
          ],
        ],
      },
    },
  },
};

export default preview;
