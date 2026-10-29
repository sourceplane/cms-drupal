import * as React from "react"
import { DrupalMenuLinkContent } from "next-drupal"

import { Navbar } from "components/navbar"
import { Footer } from "components/footer"
import { connected } from "lib/drupal"

export interface LayoutProps {
  menus: {
    main: DrupalMenuLinkContent[]
    footer: DrupalMenuLinkContent[]
  }
  children?: React.ReactNode
}

export function Layout({ menus, children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {connected ? null : (
        <p
          data-cy="sample-notice"
          className="px-6 py-2 text-sm text-center text-blue-900 bg-blue-50"
        >
          No Drupal site is connected: this is sample content. Connect one with
          DRUPAL_BASE_URL (README → Connecting Drupal).
        </p>
      )}
      <Navbar links={menus.main} />
      <main className="flex-1">{children}</main>
      <Footer links={menus.footer} />
    </div>
  )
}
