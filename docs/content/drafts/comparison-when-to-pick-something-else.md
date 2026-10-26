<!-- Hidden from docs/comparison.mdx for now. Paste it back at the end of that page to show it again. -->

## When to pick something else

Be honest with yourself about these. Wit Form doesn't have them today:

- **Server actions, SSR helpers, devtools, or frameworks other than React.**
- **Types inferred from your initial values.** Wit Form's typed hooks need you to write the values type once. Fields inside field array rows are only checked when TypeScript sees the row names as literal types (inline, or `as const`).
- **Zero re-renders for native inputs.** Every Wit Form field is controlled, so typing re-renders that field's component. React Hook Form's uncontrolled `register` avoids even that.
- **A large community.** Wit Form is new. React Hook Form has far more answers, examples and integrations online.

If any of these is a must-have, React Hook Form or TanStack Form will serve you better.
