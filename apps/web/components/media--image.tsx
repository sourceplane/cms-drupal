import Image, { ImageProps } from "next/image"

import { absoluteURL } from "lib/utils/absolute-url"
import { MediaProps } from "components/media"

interface MediaImageProps extends MediaProps, Partial<Omit<ImageProps, "objectFit">> {
  objectFit?: React.CSSProperties["objectFit"]
}

export function MediaImage({
  media,
  objectFit,
  width,
  height,
  ...props
}: MediaImageProps) {
  const image = media?.field_media_image

  if (!image) {
    return null
  }

  return (
    <Image
      src={absoluteURL(image.uri.url)}
      sizes="100vw"
      style={{ width: "100%", height: "auto", objectFit }}
      width={width || image.resourceIdObjMeta.width}
      height={height || image.resourceIdObjMeta.height}
      alt={image.resourceIdObjMeta.alt || "Image"}
      title={image.resourceIdObjMeta.title}
      {...props}
    />
  )
}
