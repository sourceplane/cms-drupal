import Image from "next/image"
import parse, {
  DOMNode,
  Element,
  HTMLReactParserOptions,
  domToReact,
} from "html-react-parser"

import { absoluteURL } from "lib/utils/absolute-url"
import { isRelative } from "lib/utils/is-relative"
import Link from "next/link"

const options: HTMLReactParserOptions = {
  replace: (domNode) => {
    if (domNode instanceof Element) {
      if (domNode.name === "img") {
        const { src, alt = "", width = "100", height = "100" } = domNode.attribs

        if (isRelative(src)) {
          return (
            <Image
              src={absoluteURL(src)}
              width={Number.parseInt(width, 10)}
              height={Number.parseInt(height, 10)}
              alt={alt}
              style={{ maxWidth: "100%", height: "auto", objectFit: "cover" }}
            />
          )
        }
      }

      if (domNode.name === "a") {
        const { href, class: className } = domNode.attribs

        if (href && isRelative(href)) {
          return (
            <Link href={href} className={className}>{domToReact(domNode.children as DOMNode[], options)}</Link>
          )
        }
      }

      if (domNode.name === "input") {
        if (domNode.attribs.value === "") {
          delete domNode.attribs.value
        }

        return domNode
      }
    }
  },
}

interface FormattedTextProps extends React.HTMLAttributes<HTMLDivElement> {
  format?: string
  processed: string
  value?: string
}

export function FormattedText({ processed, ...props }: FormattedTextProps) {
  return (
    <div data-cy="node--body" {...props}>
      {parse(processed, options)}
    </div>
  )
}
