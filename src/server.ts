import cookieParser from "cookie-parser"
import cors from "cors"
import express, {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express"
import { HttpProblemResponse } from "express-http-problem-details"
import helmet from "helmet"
import {
  DefaultMappingStrategy,
  MapperRegistry,
} from "http-problem-details-mapper"
import morgan from "morgan"

import AuthorizationErrorMapper
  from "./common/error_mappers/AuthorizationErrorMapper.js"
import DbOperationErrorMapper
  from "./common/error_mappers/DbOperationErrorMapper.js"
import ReqParamFormatErrorMapper
  from "./common/error_mappers/ReqParamFormatErrorMapper.js"
import Logger from "./common/logger.js"
import events from "./events.route.js"
import meetings from "./meetings.route.js"

const app = express()

const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    Logger.debug("server.errorHandler Headers were already sent")
    next(err)
  }
}

const allowedOrigins = [
  "https://localhost:5173",
  "https://central-demo.apps.code4recovery.org",
]

app.use(helmet())
app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not " +
          "allow access from the specified origin."
        return callback(new Error(msg), false)
      }
      return callback(null, true)
    },
  }),
)
app.use(cookieParser())
if (process.env.NODE_ENV !== "prod") app.use(morgan("dev"))
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: false }))

// Register api routes
app.use("/api/v1/meetings", meetings)
app.use("/api/v1/events", events)
Logger.debug("Routes registered.")
app.use("*", (req: Request, res: Response) => {
  res.status(404).send("Sorry, can't find that!")
})

const strategy = new DefaultMappingStrategy(
  new MapperRegistry()
    .registerMapper(new ReqParamFormatErrorMapper())
    .registerMapper(new AuthorizationErrorMapper())
    .registerMapper(new DbOperationErrorMapper()),
)
app.use(
  HttpProblemResponse({
    strategy,
  }),
)

app.use(errorHandler)

export default app
