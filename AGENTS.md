<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Frontend Rules

## 1. No Native JS Dialogs/Alerts
- **CRITICAL:** Do NOT use native JavaScript window alerts, confirms, or prompts (`window.alert()`, `window.confirm()`, `window.prompt()`, `alert()`, `confirm()`, `prompt()`).
- Instead, use the **shadcn AlertDialog** or **sonner (Toast)** component.
- To install `AlertDialog` or check documentation, utilize the `shadcn` skill/CLI:
  ```bash
  npx shadcn@latest add alert-dialog
  ```
- Make sure to compose `AlertDialog` correctly:
  - Keep interactive overlays clean, accessible, and structured with appropriate titles (`AlertDialogTitle`, `AlertDialogDescription`) for accessibility.
  - Follow the rules in `composition.md` inside the shadcn skill.

## 2. React and Next.js Best Practices
- Reference and adhere to the guidelines in [vercel-react-best-practices](file:///d:/IT%20Henry/Projects/itvault/.agents/skills/vercel-react-best-practices/SKILL.md).
- **Key Guidelines to Keep in Mind:**
  - **Eliminating Waterfalls (CRITICAL):** Use `Promise.all` for parallel independent operations. Suspense boundaries should be used to stream content.
  - **Bundle Size Optimization (CRITICAL):** Prefer statically analyzable imports and direct imports over barrel imports. Use `next/dynamic` for heavy components (such as complex dialogs).
  - **Re-render Optimization (MEDIUM):**
    - Derive state during rendering rather than inside `useEffect`.
    - Extract expensive work into memoized components or use `useMemo`/`useCallback` appropriately.
    - Pass functions to `useState` for expensive initial state values.
  - **Client-Side Rendering:** If dynamic state or event handlers (such as button clicks in dialogs) are used, mark components with `"use client"` at the top of the file. Minimize data passed from RSC to Client Components.
