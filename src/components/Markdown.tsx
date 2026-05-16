"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize from "rehype-sanitize";

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`prose prose-invert max-w-[80%] ${className ?? ""}`}>
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
          h4: ({ children }) => (
            <span className="block text-white text-2xl font-normal mt-2 tracking-wider">
              {children}
            </span>
          ),
          h5: ({ children }) => (
            <span className="block text-white text-xl font-normal mt-3 tracking-wider">
              {children}
            </span>
          ),
          h6: ({ children }) => (
            <span className="text-neutral-300 text-md font-normal mt-3 tracking-wider border-b inline-block">
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
