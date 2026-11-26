import type { ReactNode } from 'react';

/**
 * Renders inline markdown formatting (bold, italic, inline code) into React elements
 * without using dangerouslySetInnerHTML.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokenPattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenPattern);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={key}
          className="rounded bg-[#EFE8DC] px-1.5 py-0.5 font-mono text-[0.85em] text-[#7C2D12]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={key} className="font-semibold text-[#1C1917]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={key} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

/**
 * Lightweight, safe markdown-to-JSX renderer tailored for AI assistant responses
 * containing English, Roman Tulu, and Kannada script.
 */
export function FormattedMessage({ content }: { content: string }) {
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-[15px] leading-relaxed text-[#1C1917] break-words">
      {segments.map((segment, segmentIdx) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const inner = segment.slice(3, -3).replace(/^[a-zA-Z0-9_-]+\n/, '');
          return (
            <pre
              key={`code-${segmentIdx}`}
              className="overflow-x-auto rounded-xl border border-[#E5DEC9] bg-[#F5F0E6] p-3 font-mono text-xs leading-5 text-[#292524]"
            >
              <code>{inner}</code>
            </pre>
          );
        }

        const blocks = segment.split(/\n{2,}/).filter((b) => b.trim().length > 0);
        return blocks.map((block, blockIdx) => {
          const lines = block.split('\n');
          const keyBase = `seg-${segmentIdx}-blk-${blockIdx}`;

          const isUnorderedList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
          if (isUnorderedList) {
            return (
              <ul key={keyBase} className="list-disc space-y-1 pl-5">
                {lines.map((line, i) => (
                  <li key={`${keyBase}-li-${i}`}>
                    {renderInline(line.replace(/^\s*[-*•]\s+/, ''), `${keyBase}-${i}`)}
                  </li>
                ))}
              </ul>
            );
          }

          const isOrderedList = lines.every((l) => /^\s*\d+\.\s+/.test(l));
          if (isOrderedList) {
            return (
              <ol key={keyBase} className="list-decimal space-y-1 pl-5">
                {lines.map((line, i) => (
                  <li key={`${keyBase}-ol-${i}`}>
                    {renderInline(line.replace(/^\s*\d+\.\s+/, ''), `${keyBase}-${i}`)}
                  </li>
                ))}
              </ol>
            );
          }

          if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
            const headingText = lines[0].replace(/^#{1,3}\s+/, '');
            return (
              <h3 key={keyBase} className="font-semibold text-[#1C1917]">
                {renderInline(headingText, keyBase)}
              </h3>
            );
          }

          return (
            <p key={keyBase}>
              {lines.map((line, lineIdx) => (
                <span key={`${keyBase}-ln-${lineIdx}`}>
                  {lineIdx > 0 && <br />}
                  {renderInline(line, `${keyBase}-${lineIdx}`)}
                </span>
              ))}
            </p>
          );
        });
      })}
    </div>
  );
}
