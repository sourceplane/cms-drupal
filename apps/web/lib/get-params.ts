import { DrupalJsonApiParams } from "drupal-jsonapi-params"

// The template's Drupal serves several sites from one install and tags each
// node with the site it belongs to (`field_site`); DRUPAL_SITE_ID picks this
// one. A Drupal without that field leaves DRUPAL_SITE_ID unset and gets no
// filter.
export function siteFilter(params: DrupalJsonApiParams) {
  if (process.env.DRUPAL_SITE_ID) {
    params.addFilter(
      "field_site.meta.drupal_internal__target_id",
      process.env.DRUPAL_SITE_ID
    )
  }
  return params
}

export function getParams(resourceType: string) {
  const apiParams = siteFilter(new DrupalJsonApiParams())

  if (resourceType === "node--landing_page") {
    apiParams
      .addInclude([
        "field_sections",
        "field_sections.field_media.field_media_image",
        "field_sections.field_items",
        "field_sections.field_reusable_paragraph.paragraphs.field_items",
      ])
      .addFields("node--landing_page", [
        "title",
        "field_sections",
        "path",
        "status",
      ])
  }

  if (resourceType === "node--article") {
    apiParams.addInclude(["field_image", "uid"])
    apiParams.addFields(resourceType, [
      "title",
      "body",
      "uid",
      "created",
      "field_image",
      "status",
      "metatag",
    ])
  }

  return apiParams.getQueryObject()
}
