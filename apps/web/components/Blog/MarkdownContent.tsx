import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/** Renders article Markdown while leaving raw HTML disabled. */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "space-y-5 leading-7 text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_hr]:border-border [&_img]:mx-auto [&_img]:max-h-[32rem] [&_img]:rounded-xl [&_li]:ml-6 [&_ol]:list-decimal [&_p]:text-base [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_ul]:list-disc",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
