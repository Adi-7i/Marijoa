"use client";

import { memo, type ComponentPropsWithoutRef, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "@/components/chat/MarkdownMessage.module.css";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * Allow only safe URL schemes. Disallowed values cause the link to be
 * rendered as plain text by the `a` component below (we still surface
 * the visible text the model produced).
 */
const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];

function isSafeHref(href: string | undefined): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  if (!trimmed) return false;
  // Relative URLs (no scheme) are allowed — they cannot escape the origin.
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return true;
  }
  try {
    // Use a base so bare paths still parse; absolute schemes override the base.
    const parsed = new URL(trimmed, "https://marijoa.invalid/");
    if (parsed.origin === "https://marijoa.invalid") {
      // Was a relative URL that we already allowed above; safe.
      return true;
    }
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * react-markdown's `urlTransform` runs on every href/src. We use it to
 * neutralise unsafe URLs (javascript:, data:, vbscript:, etc.) by returning
 * an empty string. The `a` component then drops the href entirely.
 */
function safeUrlTransform(url: string): string {
  return isSafeHref(url) ? url : "";
}

type CodeProps = ComponentPropsWithoutRef<"code"> & { node?: unknown };

const components: Components = {
  h1: ({ children, ...rest }) => (
    <h1 {...rest} className={styles.h1}>
      {children}
    </h1>
  ),
  h2: ({ children, ...rest }) => (
    <h2 {...rest} className={styles.h2}>
      {children}
    </h2>
  ),
  h3: ({ children, ...rest }) => (
    <h3 {...rest} className={styles.h3}>
      {children}
    </h3>
  ),
  p: ({ children, ...rest }) => (
    <p {...rest} className={styles.paragraph}>
      {children}
    </p>
  ),
  ul: ({ children, ...rest }) => (
    <ul {...rest} className={styles.ul}>
      {children}
    </ul>
  ),
  ol: ({ children, ...rest }) => (
    <ol {...rest} className={styles.ol}>
      {children}
    </ol>
  ),
  li: ({ children, ...rest }) => (
    <li {...rest} className={styles.li}>
      {children}
    </li>
  ),
  table: ({ children, ...rest }) => (
    <div className={styles.tableWrap}>
      <table {...rest} className={styles.table}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...rest }) => (
    <thead {...rest} className={styles.thead}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...rest }) => <tbody {...rest}>{children}</tbody>,
  tr: ({ children, ...rest }) => (
    <tr {...rest} className={styles.tr}>
      {children}
    </tr>
  ),
  th: ({ children, ...rest }) => (
    <th {...rest} className={styles.th}>
      {children}
    </th>
  ),
  td: ({ children, ...rest }) => (
    <td {...rest} className={styles.td}>
      {children}
    </td>
  ),
  blockquote: ({ children, ...rest }) => (
    <blockquote {...rest} className={styles.blockquote}>
      {children}
    </blockquote>
  ),
  hr: (props) => <hr {...props} className={styles.hr} />,
  a: ({ href, children, ...rest }) => {
    // urlTransform may have stripped an unsafe href to "" — render as text.
    if (!href || !isSafeHref(href)) {
      return <span className={styles.unsafeLink}>{children as ReactNode}</span>;
    }
    return (
      <a
        {...rest}
        href={href}
        className={styles.link}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {children}
      </a>
    );
  },
  pre: ({ children, ...rest }) => (
    <pre {...rest} className={styles.codeBlock}>
      {children}
    </pre>
  ),
  code: ({ className, children, ...rest }: CodeProps) => {
    // Fenced code blocks always receive a `language-xxx` className from
    // remark-gfm / mdast. Inline code does not.
    const isFenced =
      typeof className === "string" && /\blanguage-[\w-]+/.test(className);
    if (isFenced) {
      return (
        <code {...rest} className={`${styles.codeFenced} ${className ?? ""}`}>
          {children}
        </code>
      );
    }
    return (
      <code {...rest} className={styles.inlineCode}>
        {children}
      </code>
    );
  },
};

function MarkdownMessageImpl({ content, className }: MarkdownMessageProps) {
  return (
    <div className={`${styles.root} ${className ?? ""}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={safeUrlTransform}
        components={components}
        skipHtml
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownMessage = memo(MarkdownMessageImpl);
export default MarkdownMessage;
