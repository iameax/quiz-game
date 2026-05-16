"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize from "rehype-sanitize";

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`prose prose-invert max-w-none ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          em: ({ children }) => (
            <span
              dir="rtl"
              lang="ar"
              className="font-arabic not-italic text-amber-300"
              style={{ fontFamily: "var(--font-arabic), serif", fontSize: "150%", fontWeight: "500" }}
            >
              {children}
            </span>
          ),
          h6: ({ children }) => (
            <span className="block text-neutral-300 text-lg font-normal mt-3 tracking-wider">
              {children}
            </span>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
