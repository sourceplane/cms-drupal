import * as React from "react"
import Router from "next/router"
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
} from "@tanstack/react-query"
import type { AppProps } from "next/app"
import NProgress from "nprogress"
import { syncDrupalPreviewRoutes } from "next-drupal"
import "nprogress/nprogress.css"

import "styles/globals.css"

NProgress.configure({ showSpinner: false })

Router.events.on("routeChangeStart", function (path) {
  syncDrupalPreviewRoutes(path)
  NProgress.start()
})
Router.events.on("routeChangeComplete", () => NProgress.done())
Router.events.on("routeChangeError", () => NProgress.done())

export default function App({ Component, pageProps }: AppProps) {
  const queryClientRef = React.useRef<QueryClient | null>(null)
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient()
  }
  return (
    <QueryClientProvider client={queryClientRef.current}>
      <HydrationBoundary state={pageProps.dehydratedState}>
        <Component {...pageProps} />
      </HydrationBoundary>
    </QueryClientProvider>
  )
}
