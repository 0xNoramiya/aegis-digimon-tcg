import Markdown from "react-markdown";

export function ForumMarkdown({ children }: { children: string }) {
  return (
    <div className="forum-markdown">
      <Markdown
        skipHtml
        disallowedElements={["img"]}
        components={{
          h1: ({ children: content }) => <h3>{content}</h3>,
          h2: ({ children: content }) => <h3>{content}</h3>,
          a: ({ children: content, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {content}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
