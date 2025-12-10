import { Router } from "express";
import { healthCheck } from "../controllers/healthCheck.controller.js";
const router = Router();

router.route("/").get(healthCheck); // this will tel the express that whenever there is a
// get request on the /(api/v1/healtcheck) you run the function healthCheck
export default router;
