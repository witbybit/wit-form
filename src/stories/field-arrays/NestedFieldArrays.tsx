import { useMemo, useState } from 'react';
import {
  useFieldArray,
  useFieldArrayColumnWatch,
  useForm,
  withFormProvider,
  type IAncestorInput,
} from 'wit-form';
import { NumberField, TextField } from '../components/fields';
import { Button, Card, Example, FormInspector } from '../components/ui';

const validateLessons = (rows: unknown[]) =>
  rows.length === 0 ? 'Add at least one lesson' : null;

const newSectionLessons = [{ minutes: 10 }];

const validateSections = (rows: unknown[]) =>
  rows.length === 0 ? 'Add at least one section' : null;

function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** Sums the minutes column of one section's lessons */
function SectionDuration(props: { ancestors: IAncestorInput[] }) {
  const { values } = useFieldArrayColumnWatch({
    fieldArrayName: 'lessons',
    fieldNames: ['minutes'],
    ancestors: props.ancestors,
  });
  const total = values.reduce(
    (sum: number, lesson: { minutes?: number }) => sum + (lesson.minutes ?? 0),
    0
  );
  return (
    <span className="text-xs text-slate-500 tabular-nums">
      {values.length} lessons · {formatMinutes(total)}
    </span>
  );
}

/** The inner field array. Its ancestors point at the section row it belongs to. */
function Lessons(props: { sectionAncestors: IAncestorInput[] }) {
  const { fieldArrayProps, append, remove, error } = useFieldArray({
    name: 'lessons',
    fieldNames: ['title', 'minutes'],
    ancestors: props.sectionAncestors,
    validate: validateLessons,
    // Rows for a new section, which has no initial lessons
    defaultValue: newSectionLessons,
  });

  return (
    <div className="space-y-2">
      {fieldArrayProps.rowIds.map((rowId, index) => (
        <Lesson
          key={rowId}
          sectionAncestors={props.sectionAncestors}
          rowId={rowId}
          index={index}
          onRemove={() => remove(index)}
        />
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button size="sm" variant="ghost" onClick={() => append({ minutes: 10 })}>
        + Add lesson
      </Button>
    </div>
  );
}

function Lesson(props: {
  sectionAncestors: IAncestorInput[];
  rowId: number;
  index: number;
  onRemove: () => void;
}) {
  // Outermost array first: [section row, lesson row]
  const ancestors = useMemo(
    () => [...props.sectionAncestors, { name: 'lessons', rowId: props.rowId }],
    [props.sectionAncestors, props.rowId]
  );
  return (
    <div className="flex items-start gap-2">
      <span className="w-6 pt-2 text-right text-xs text-slate-400 tabular-nums">
        {props.index + 1}.
      </span>
      <TextField
        className="flex-1"
        name="title"
        label="Lesson title"
        hideLabel
        placeholder="Lesson title"
        ancestors={ancestors}
        required
      />
      <NumberField
        className="w-24"
        name="minutes"
        label="Minutes"
        hideLabel
        placeholder="min"
        ancestors={ancestors}
        required
      />
      <Button
        size="sm"
        variant="ghost"
        className="mt-1"
        onClick={props.onRemove}
      >
        Remove
      </Button>
    </div>
  );
}

function Section(props: {
  rowId: number;
  index: number;
  onRemove: () => void;
}) {
  const ancestors = useMemo(
    () => [{ name: 'sections', rowId: props.rowId }],
    [props.rowId]
  );
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <TextField
          className="flex-1"
          name="title"
          label={`Section ${props.index + 1}`}
          ancestors={ancestors}
          required
        />
        <Button
          size="sm"
          variant="danger"
          className="mt-6"
          onClick={props.onRemove}
        >
          Remove section
        </Button>
      </div>
      <SectionDuration ancestors={ancestors} />
      <Lessons sectionAncestors={ancestors} />
    </div>
  );
}

function CourseBuilder() {
  const [submitted, setSubmitted] = useState<unknown>();

  const { handleSubmit } = useForm({
    initialValues: {
      course: 'Forms in React',
      sections: [
        {
          title: 'Getting started',
          lessons: [
            { title: 'Why another form library?', minutes: 6 },
            { title: 'Your first form', minutes: 14 },
          ],
        },
        {
          title: 'Field arrays',
          lessons: [{ title: 'Rows and row ids', minutes: 12 }],
        },
      ],
    },
    onSubmit: (values) => setSubmitted(values),
  });

  const { fieldArrayProps, append, remove, error } = useFieldArray({
    name: 'sections',
    // Each section renders its own useFieldArray for its lessons
    fieldNames: ['title'],
    validate: validateSections,
  });

  return (
    <Example
      title="Course builder"
      description="A field array inside a field array. Each section has its own list of lessons and its own running duration."
      aside={<FormInspector submitted={submitted} />}
    >
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <TextField name="course" label="Course title" required />
          {fieldArrayProps.rowIds.map((rowId, index) => (
            <Section
              key={rowId}
              rowId={rowId}
              index={index}
              onRemove={() => remove(index)}
            />
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={() => append({})}>+ Add section</Button>
            <Button type="submit" variant="primary">
              Publish course
            </Button>
          </div>
        </form>
      </Card>
    </Example>
  );
}

export default withFormProvider(CourseBuilder);
