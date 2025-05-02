import { Router } from "express"

// import { body, query } from "express-validator"
// import { AuthorizationMiddleware } from "../auth/middleware/AuthorizationMiddleware.js"
// import { verifyFieldsErrors } from "../common/middleware/body-query-validation.middleware.js"
// import TokenMiddleWare from "../common/middleware/TokenMiddleWare.js"
import * as meetingsController from "./meetings.controller.js"

const router = Router()

router.route("/").get(
  // TokenMiddleWare.extractAPIToken,
  // query("apiToken").isString().isLength({ min: 64, max: 64 }),
  // verifyFieldsErrors,
  // AuthorizationMiddleware.isTokenAuthorized,
  meetingsController.meetings,
)

router.route("/:slug").get(meetingsController.bySlug)

router
  .route("/:slug/related-group-info")
  .get(meetingsController.relatedGroupInfo)

export default router
