import { Fragment, ReactNode } from "react";

// Minimal renderer for the subset of Markdown Gemini returns: paragraphs, headings,
// bullet / numbered lists, **bold**, *italic* and `code`. Builds React elements
// (no innerHTML), so LLM output can't inject markup.

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-[#e4dcf7]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={i}
          className="font-mono text-[12px] px-1 py-0.5 rounded bg-[#a78bfa]/10 text-[#d8ccf5]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

type Block =
  | { kind: "p" | "h"; text: string }
  | { kind: "ul" | "ol"; items: string[] };

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const last = blocks[blocks.length - 1];

    if (bullet || numbered) {
      const kind = bullet ? "ul" : "ol";
      const text = (bullet ?? numbered)![1];
      if (last && last.kind === kind) last.items.push(text);
      else blocks.push({ kind, items: [text] });
    } else if (heading) {
      blocks.push({ kind: "h", text: heading[1] });
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }
  return blocks;
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-2.5">
      {parseBlocks(children).map((block, i) => {
        switch (block.kind) {
          case "h":
            return (
              <p key={i} className="font-semibold text-[#e4dcf7]">
                {renderInline(block.text)}
              </p>
            );
          case "ul":
          case "ol": {
            const List = block.kind;
            return (
              <List
                key={i}
                className={`pl-5 space-y-1.5 ${block.kind === "ul" ? "list-disc" : "list-decimal"} marker:text-[#a78bfa]/60`}
              >
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </List>
            );
          }
          default:
            return <p key={i}>{renderInline(block.text)}</p>;
        }
      })}
    </div>
  );
}
