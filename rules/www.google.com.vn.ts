import { defineRule } from "../scripts/defineRule";

export default defineRule({
  condition: {
    urlFilter: "||www.google.com.vn/*",
    resourceTypes: [
      "main_frame",
      "sub_frame",
      "stylesheet",
      "script",
      "image",
      "object",
      "xmlhttprequest",
      "other"
    ],
  },
  id: 1,
  priority: 1,
});