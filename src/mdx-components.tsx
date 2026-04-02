import type { MDXComponents } from "mdx/types";

// Used by Next.js MDX to map Markdown elements to React components.
// We keep the default mapping for now but can customize later.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  };
}
