import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  className?: string;
}

/// Sanitize schema with target+rel explicitly whitelisted. Default schema
/// strips them on <a> elements, which would defeat our open-in-system-browser
/// behaviour for the Tauri webview.
const SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), "target", "rel"],
  },
};

/// Markdown renderer for assistant chat messages (and anywhere else we want
/// to render LLM output safely). GFM gives us tables + strikethrough; sanitize
/// strips raw HTML so model output can't inject scripts or break the layout.
export default function MarkdownView({ content, className }: Props) {
  return (
    <div
      className={`prose prose-sm max-w-none prose-pre:bg-slate-900 prose-pre:text-slate-100 ${className ?? ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, SCHEMA]]}
        components={{
          // Destructure `node` (react-markdown v9 injects it) so it doesn't
          // land on the DOM element and trip React's invalid-attribute warning.
          a: ({ node: _node, href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
              {...props}
            >
              {children}
            </a>
          ),
          code: ({ node: _node, children, className: codeClass, ...props }) => {
            // Inline code shouldn't get the prose-pre treatment; differentiate
            // by checking for the `language-*` class react-markdown injects on
            // fenced blocks.
            const isBlock = (codeClass ?? "").startsWith("language-");
            if (isBlock) {
              return (
                <code className={codeClass} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
