import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  className?: string;
}

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
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ href, children, ...props }) => (
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
          // Inline code shouldn't get the prose-pre treatment; differentiate
          // by checking for the `inline` flag react-markdown injects.
          code: ({ children, className, ...props }) => {
            const isBlock = (className ?? "").startsWith("language-");
            if (isBlock) {
              return (
                <code className={className} {...props}>
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
