import config from "../../tooling/eslint/index.js";

// next-drupal hands back Drupal's entities untyped (`DrupalNode` is an index
// type): the tests read their fields as `any`, as the template's components do.
export default [...config, { files: ["**/*.ts"], rules: { "@typescript-eslint/no-explicit-any": "off" } }];
